using HomeAutomationHub.Api;
using HomeAutomationHub.Core;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Models;
using HomeAutomationHub.Services;
using HomeAutomationHub.Services.RuleEngine;

var builder = WebApplication.CreateBuilder(args);

// Service registrations
builder.Services.AddSingleton<IRuleEngineService, RuleEngineService>();
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
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

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

devices.MapPost("/{deviceId}/command", async (string deviceId, DeviceCommandRequest req, MqttListenerService mqtt) =>
{
    if (string.IsNullOrWhiteSpace(req?.Command)) return Results.BadRequest();

    await mqtt.PublishCommandAsync(deviceId, req.Command).ConfigureAwait(false);
    return Results.Accepted($"/api/devices/{deviceId}");
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