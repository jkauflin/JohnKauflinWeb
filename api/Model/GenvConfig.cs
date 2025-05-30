
using System;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function.Model
{
    public class GenvConfig
    {
        public string id { get; set; }                  // Just "1"
        public int ConfigId { get; set; }               // Partition key (1)
        public string configDesc { get; set; }
        public string daysToGerm { get; set; }
        public int daysToBloom { get; set; }
        public string germinationStart { get; set; }
        public string plantingDate { get; set; }
        public string harvestDate { get; set; }
        public string cureDate { get; set; }
        public string productionDate { get; set; }
        public float configCheckInterval { get; set; }
        public float logMetricInterval { get; set; }
        public bool loggingOn { get; set; }
        public bool selfieOn { get; set; }
        public bool autoSetOn { get; set; }
        public float targetTemperature { get; set; }
        public float currTemperature { get; set; }
        public float airInterval { get; set; }
        public float airDuration { get; set; }
        public float heatInterval { get; set; }
        public float heatDuration { get; set; }
        public float waterInterval { get; set; }
        public float waterDuration { get; set; }
        public float lightDuration { get; set; }
        public string lastUpdateTs { get; set; }
        public string lastWaterTs { get; set; }
        public float lastWaterSecs { get; set; }
        public string requestCommand { get; set; }
        public string requestValue { get; set; }
        public string requestResult { get; set; }

/*        
            configDesc: process.env.configDesc,
            daysToGerm: process.env.daysToGerm,
            daysToBloom: parseInt(process.env.daysToBloom),
            germinationStart: process.env.germinationStart,
            plantingDate: process.env.plantingDate,
            harvestDate: '2099-01-01',
            cureDate: '2099-01-01',
            productionDate: '2099-01-01',
            configCheckInterval: parseFloat(process.env.configCheckInterval),
            logMetricInterval: parseFloat(process.env.logMetricInterval),
            loggingOn: parseInt(process.env.loggingOn),
            selfieOn: parseInt(process.env.selfieOn),
            targetTemperature: parseFloat(process.env.targetTemperature),
            currTemperature: parseFloat(process.env.targetTemperature),
            airInterval: parseFloat(process.env.airInterval),
            airDuration: parseFloat(process.env.airDuration),
            heatInterval: parseFloat(process.env.heatInterval),
            heatDuration: parseFloat(process.env.heatDuration),
            waterInterval: parseFloat(process.env.waterInterval),
            waterDuration: parseFloat(process.env.waterDuration),
            lightDuration: parseFloat(process.env.lightDuration),
            lastUpdateTs: getDateStr(),
            lastWaterTs: getDateStr(),
            lastWaterSecs: 0.0,
            requestCommand: '',
            requestValue: ''
        */

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

}
