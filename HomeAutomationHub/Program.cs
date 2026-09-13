using HomeAutomationHub.Core;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Services;
using HomeAutomationHub.Api;

var builder = WebApplication.CreateBuilder(args);

// Service registrations
builder.Services.AddSingleton<IDeviceStateStore, InMemoryDeviceStateStore>();
builder.Services.AddSingleton<MqttListenerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<MqttListenerService>());
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS for local Vite frontend
const string AllowFrontend = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowFrontend, policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

var app = builder.Build();

// HTTP pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// In development, avoid forcing HTTPS so the Vite dev server (HTTP) can call APIs without redirect.
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

devices.MapPost("/{deviceId}/command", async (string deviceId, DeviceCommandRequest req, MqttListenerService mqtt) =>
{
    if (string.IsNullOrWhiteSpace(req?.Command)) return Results.BadRequest();

    await mqtt.PublishCommandAsync(deviceId, req.Command).ConfigureAwait(false);
    return Results.Accepted($"/api/devices/{deviceId}");
});

app.Run();
