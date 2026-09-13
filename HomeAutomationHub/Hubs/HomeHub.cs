namespace HomeAutomationHub.Hubs;

using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

public class HomeHub : Hub<IHomeClient>
{
    public override async Task OnConnectedAsync()
    {
        // Send a welcome notification to the newly connected client
        await Clients.Caller.NotificationReceived("Welcome", "Connected to Home Automation Hub");
        await base.OnConnectedAsync();
    }
}
