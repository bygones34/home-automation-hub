namespace HomeAutomationHub.Data;

using HomeAutomationHub.Data.Entities;
using Microsoft.EntityFrameworkCore;

public class HomeAutomationDbContext : DbContext
{
    public HomeAutomationDbContext(DbContextOptions<HomeAutomationDbContext> options)
        : base(options)
    {
    }

    public DbSet<DeviceEntity> Devices => Set<DeviceEntity>();
    public DbSet<AutomationRuleEntity> Rules => Set<AutomationRuleEntity>();
    public DbSet<TelemetryRecordEntity> TelemetryRecords => Set<TelemetryRecordEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<DeviceEntity>(entity =>
        {
            entity.HasKey(e => e.DeviceId);
            entity.Property(e => e.DeviceId).HasMaxLength(128);
            entity.Property(e => e.DeviceType).HasMaxLength(64);
            entity.Property(e => e.Room).HasMaxLength(64);
        });

        modelBuilder.Entity<AutomationRuleEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(128);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.SourceDeviceId).HasMaxLength(128);
            entity.Property(e => e.TargetDeviceId).HasMaxLength(128);
            entity.Property(e => e.TelemetryKey).HasMaxLength(64);
            entity.Property(e => e.TargetAction).HasMaxLength(64);
            entity.Property(e => e.Operator).HasConversion<string>().HasMaxLength(32);
        });

        modelBuilder.Entity<TelemetryRecordEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DeviceId).HasMaxLength(128);
            entity.HasIndex(e => new { e.DeviceId, e.TimestampUtc });
        });
    }
}
