
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
        //public string lastUpdateTs { get; set; }
        //public string lastWaterTs { get; set; }
        //public float lastWaterSecs { get; set; }
        public string requestCommand { get; set; }
        public string requestValue { get; set; }
        public string requestResult { get; set; }
        public string notes { get; set; }
        public int s0day { get; set; }
        public int s0waterDuration { get; set; }
        public int s0waterInterval { get; set; }
        public int s1day { get; set; }
        public int s1waterDuration { get; set; }
        public int s1waterInterval { get; set; }
        public int s2day { get; set; }
        public int s2waterDuration { get; set; }
        public int s2waterInterval { get; set; }
        public int s3day { get; set; }
        public int s3waterDuration { get; set; }
        public int s3waterInterval { get; set; }
        public int s4day { get; set; }
        public int s4waterDuration { get; set; }
        public int s4waterInterval { get; set; }
        public int s5day { get; set; }
        public int s5waterDuration { get; set; }
        public int s5waterInterval { get; set; }
        public int s6day { get; set; }
        public int s6waterDuration { get; set; }
        public int s6waterInterval { get; set; }

        
/*        
                            "id": "9",
                            "ConfigId": 9,
                            "configDesc": "JJK09 - WW",
                            "daysToGerm": "4 days - 1 day soak, 3 days to crack and get tap",
                            "daysToBloom": 60,
                            "germinationStart": "2025-06-20",
                            "plantingDate": "2025-06-24",
                            "harvestDate": "2025-08-23",
                            "cureDate": "2025-09-06",
                            "productionDate": "2025-09-20",
                            "configCheckInterval": 30,
                            "logMetricInterval": 30,
                            "loggingOn": 1,
                            "selfieOn": 1,
                            "autoSetOn": 1,
                            "targetTemperature": 78,
                            "currTemperature": 79.93,
                            "airInterval": 0.7,
                            "airDuration": 0.8,
                            "heatInterval": 0.6,
                            "heatDuration": 0.8,
                            "waterInterval": 10,
                            "waterDuration": 5,
                            "lightDuration": 19,
                            "lastUpdateTs": "2025-07-04 13:44:58",
                            "lastWaterTs": "2025-07-04 09:04:29",
                            "lastWaterSecs": 0,
                            "requestCommand": "",
                            "requestValue": "",
                            "requestResult": "",
                            "notes": "",

                            "s0day": 0,
                            "s0waterDuration": 6,
                            "s0waterInterval": 7,
                            "s1day": 10,
                            "s1waterDuration": 7,
                            "s1waterInterval": 9,
                            "s2day": 20,
                            "s2waterDuration": 14,
                            "s2waterInterval": 20,
                            "s3day": 25,
                            "s3waterDuration": 24,
                            "s3waterInterval": 24,
                            "s4day": 32,
                            "s4waterDuration": 27,
                            "s4waterInterval": 24,
                            "s5day": 40,
                            "s5waterDuration": 30,
                            "s5waterInterval": 24,
                            "s6day": 45,
                            "s6waterDuration": 35,
                            "s6waterInterval": 24,

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
