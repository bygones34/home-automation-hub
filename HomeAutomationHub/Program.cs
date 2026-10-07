using HomeAutomationHub.Api;
using HomeAutomationHub.Configuration;
using HomeAutomationHub.Core;
using HomeAutomationHub.Data;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Models;
using HomeAutomationHub.Services;
using HomeAutomationHub.Services.RuleEngine;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configuration Options registration
builder.Services.Configure<MqttOptions>(builder.Configuration.GetSection(MqttOptions.SectionName));
builder.Services.Configure<DeviceHealthOptions>(builder.Configuration.GetSection(DeviceHealthOptions.SectionName));
builder.Services.Configure<RuleEngineOptions>(builder.Configuration.GetSection(RuleEngineOptions.SectionName));
builder.Services.Configure<CorsOptions>(builder.Configuration.GetSection(CorsOptions.SectionName));

// EF Core SQLite registration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=homeautomationhub.db";
builder.Services.AddDbContext<HomeAutomationDbContext>(options =>
    options.UseSqlite(connectionString));

// Service registrations
builder.Services.AddSingleton<IRuleEngineService, RuleEngineService>();
builder.Services.AddSingleton<IDeviceStateStore, InMemoryDeviceStateStore>();
builder.Services.AddSingleton<ITelemetryHistoryService, TelemetryHistoryService>();
builder.Services.AddSingleton<MqttListenerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<MqttListenerService>());
builder.Services.AddHostedService<DeviceHealthMonitorService>();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS configuration from options
const string AllowFrontend = "AllowFrontend";
var corsConfig = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowFrontend, policy =>
    {
        policy.WithOrigins(corsConfig.AllowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// SQLite veritabanı şemasını ve WAL modunu ilklendir
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();
    await db.Database.EnsureCreatedAsync();
    try
    {
        await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""TelemetryRecords"" (
                ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                ""DeviceId"" TEXT NOT NULL,
                ""TimestampUtc"" TEXT NOT NULL,
                ""Temperature"" REAL NULL,
                ""Humidity"" REAL NULL,
                ""Power"" REAL NULL,
                ""TargetTemperature"" REAL NULL,
                ""Brightness"" REAL NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_TelemetryRecords_DeviceId_TimestampUtc""
            ON ""TelemetryRecords"" (""DeviceId"", ""TimestampUtc"");
        ");
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Devices"" ADD COLUMN ""IsOnline"" INTEGER NOT NULL DEFAULT 1;");
        }
        catch
        {
            // Column already exists or table was just created
        }
    }
    catch
    {
        // in-memory / test provider fallback
    }
}

// HTTP pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(AllowFrontend);

// SignalR hub
app.MapHub<HomeHub>("/hubs/home");

// Minimal API: /api/devices
var devices = app.MapGroup("/api/devices");

devices.MapGet("/", (IDeviceStateStore store) => Results.Ok(store.GetAllStates()));

devices.MapGet("/{deviceId}", (string deviceId, IDeviceStateStore store) =>
{
    var state = store.GetState(deviceId);
    return state is null ? Results.NotFound() : Results.Ok(state);
});

devices.MapGet("/{deviceId}/telemetry/history", async (string deviceId, string? range, ITelemetryHistoryService historyService) =>
{
    var history = await historyService.GetHistoryAsync(deviceId, range);
    return Results.Ok(history);
});

devices.MapPost("/{deviceId}/command", async (string deviceId, DeviceCommandRequest req, MqttListenerService mqtt) =>
{
    if (string.IsNullOrWhiteSpace(req?.Command)) return Results.BadRequest();

    await mqtt.PublishCommandAsync(deviceId, req.Command).ConfigureAwait(false);
    return Results.Accepted($"/api/devices/{deviceId}");
});

devices.MapPatch("/{deviceId}/room", (string deviceId, DeviceRoomRequest req, IDeviceStateStore store, IHubContext<HomeHub, IHomeClient> hubContext) =>
{
    if (string.IsNullOrWhiteSpace(req?.Room)) return Results.BadRequest();

    var updated = store.UpdateRoom(deviceId, req.Room.Trim());
    if (!updated) return Results.NotFound();

    var state = store.GetState(deviceId);
    if (state != null)
    {
        _ = hubContext.Clients.All.DeviceStateChanged(state);
    }
    return Results.Ok(state);
});

// Minimal API: /api/rules (Otomasyon Kural Motoru Endpoint'leri)
var rules = app.MapGroup("/api/rules");

rules.MapGet("/", (IRuleEngineService ruleEngine) =>
    Results.Ok(ruleEngine.GetRules()));

rules.MapPost("/", (AutomationRule rule, IRuleEngineService ruleEngine) =>
{
    var created = ruleEngine.AddRule(rule);
    return Results.Created($"/api/rules/{created.Id}", created);
});

rules.MapDelete("/{id}", (string id, IRuleEngineService ruleEngine) =>
{
    var deleted = ruleEngine.DeleteRule(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

rules.MapPatch("/{id}/toggle", (string id, bool isEnabled, IRuleEngineService ruleEngine) =>
{
    var toggled = ruleEngine.ToggleRule(id, isEnabled);
    return toggled ? Results.Ok() : Results.NotFound();
});

app.Run();