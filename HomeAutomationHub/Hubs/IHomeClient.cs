namespace HomeAutomationHub.Hubs;

using System.Threading.Tasks;
using HomeAutomationHub.Core;

public interface IHomeClient
{
    Task DeviceStateChanged(DeviceState state);

    Task NotificationReceived(string title, string message);
}
