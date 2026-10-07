namespace HomeAutomationHub.Services;

using System;
using System.Threading;
using System.Threading.Tasks;
using HomeAutomationHub.Configuration;
using HomeAutomationHub.Core;
using HomeAutomationHub.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public sealed class DeviceHealthMonitorService : BackgroundService
{
    private readonly IDeviceStateStore _deviceStateStore;
    private readonly IHubContext<HomeHub, IHomeClient> _hubContext;
    private readonly IOptions<DeviceHealthOptions> _healthOptions;
    private readonly ILogger<DeviceHealthMonitorService> _logger;

    public DeviceHealthMonitorService(
        IDeviceStateStore deviceStateStore,
        IHubContext<HomeHub, IHomeClient> hubContext,
        IOptions<DeviceHealthOptions> healthOptions,
        ILogger<DeviceHealthMonitorService> logger)
    {
        _deviceStateStore = deviceStateStore ?? throw new ArgumentNullException(nameof(deviceStateStore));
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _healthOptions = healthOptions ?? throw new ArgumentNullException(nameof(healthOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var options = _healthOptions.Value;
        var timeoutSeconds = options.HeartbeatTimeoutSeconds;
        var scanIntervalSeconds = options.ScanIntervalSeconds;

        _logger.LogInformation(
            "Cihaz Sağlığı & Heartbeat Tarayıcısı başlatıldı. Zaman aşımı eşiği: {TimeoutSeconds} sn, Tarama periyodu: {ScanIntervalSeconds} sn.",
            timeoutSeconds, scanIntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(scanIntervalSeconds), stoppingToken).ConfigureAwait(false);

                var now = DateTime.UtcNow;
                var devices = _deviceStateStore.GetAllStates();

                foreach (var device in devices)
                {
                    // Sadece şu an online olan cihazları zaman aşımı için kontrol et
                    if (!device.IsOnline)
                    {
                        continue;
                    }

                    var elapsed = now - device.LastUpdatedUtc;
                    if (elapsed.TotalSeconds >= timeoutSeconds)
                    {
                        var statusChanged = _deviceStateStore.SetOnlineStatus(device.DeviceId, false);
                        if (statusChanged)
                        {
                            var updated = _deviceStateStore.GetState(device.DeviceId);
                            if (updated != null)
                            {
                                await _hubContext.Clients.All.DeviceStateChanged(updated).ConfigureAwait(false);
                            }

                            var minutes = Math.Max(1, Math.Round(elapsed.TotalMinutes, 1));
                            await _hubContext.Clients.All.NotificationReceived(
                                "Cihaz Çevrimdışı",
                                $"{device.DeviceId} cihazından yanıt alınamadı ({minutes} dk iletişimsiz).")
                                .ConfigureAwait(false);

                            _logger.LogWarning(
                                "Cihaz zaman aşımına uğradı ve ÇEVRİMDIŞI olarak işaretlendi: {DeviceId} ({Elapsed:F0} sn yanıt yok)",
                                device.DeviceId, elapsed.TotalSeconds);
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cihaz sağlığı taraması sırasında beklenmeyen bir hata oluştu.");
            }
        }

        _logger.LogInformation("Cihaz Sağlığı & Heartbeat Tarayıcısı durduruldu.");
    }
}
