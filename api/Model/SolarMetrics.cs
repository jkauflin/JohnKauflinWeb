
using System;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function.Model
{
    public class SolarMetrics
    {
        public List<MetricPoint>? pointList { get; set; }
        public List<MetricTotal>? totalList { get; set; }
        public List<MetricYearTotal>? yearTotalList { get; set; }
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
