using System;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace JohnKauflinWeb.Function
{
    public class PurgeDatabaseDaily
    {
        private readonly ILogger _logger;

        public PurgeDatabaseDaily(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<PurgeDatabaseDaily>();
        }

        [Function("PurgeDatabaseDaily")]
        public void Run([TimerTrigger("0 0 0 * * *")] TimerInfo myTimer)
        {
            _logger.LogInformation($"C# Timer trigger function executed at: {DateTime.Now}");
            
            if (myTimer.ScheduleStatus is not null)
            {
                _logger.LogInformation($"Next timer schedule at: {myTimer.ScheduleStatus.Next}");
            }
        }
    }
}
