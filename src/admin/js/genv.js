/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Main module to handle interactions with database and update
                of solar metrics components on the web page.  Module
                uses chart.js library included in the main web page
--------------------------------------------------------------------------------
Modification History
2024-05-17 JJK  Initial version - moved metrics components to this module
2024-06-14 JJK  Test deploy
2024-06-23 JJK  Added AmpMaxValue and WattMaxValue to the Totals query and 
                display of last 10 values in a table
2024-12-06 JJK  Added util module and loading spinner (and corrected 
                getDateDayInt for the correct day buckets in metrics)
2025-03-26 JJK  Modified to accept start and end hours from screen inputs
2025-04-02 JJK  Working on start and stop date and time
================================================================================*/

import {empty,showLoadingSpinner,formatDate,addDays,addHours,getDateInt,getDateDayInt,getHoursInt} from './util.js';

//solarTileButton.addEventListener("click", querySolarMetrics);
const dailyTempCanvas = document.getElementById("DailyTempCanvas")
var dailyTempChart = null
var metricsStartDate = document.getElementById("MetricsStartDate")
var metricsStopDate = document.getElementById("MetricsStopDate")
//var startHour = document.getElementById("StartHour")
//var stopHour = document.getElementById("StopHour")
var numHours = document.getElementById("NumHours")
var getDataButton = document.getElementById("GetDataButton")
var getDataButtonHTML = '<i class="fa fa-area-chart me-1"></i> Get Data'
getDataButton.innerHTML = getDataButtonHTML
getDataButton.addEventListener("click", queryGenvMetrics);

//var currDT = new Date()
//console.log("currDT = "+currDT+", currDT.toISOString() = "+currDT.toISOString()+", 0,16 = "+currDT.toISOString().substring(0,16))
//metricsStartDate.value = formatDate()
//metricsStartDate.value = '2025-04-02T21:27'
metricsStartDate.value = getLocalISOTime()
//metricsStopDate.value = formatDate()
//metricsStopDate.value = getLocalISOTime()

/*
let dateStr = td.toISOString()  //2024-01-31T19:37:12.291Z

<input
id="party"
type="datetime-local"
name="party-date"
value="2017-06-01T08:30" />

startHour.value = 7
stopHour.value = 8
//numHours.value = 2
*/

//var messageDisplay = document.getElementById("MessageDisplay")
//<div id="MessageDisplay" class="m-2"></div>
/*
var addressInput = document.getElementById("address");
document.getElementById("InputValues").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault()
        fetchPropertiesData()
    }
})
*/

function getLocalISOTime() {
    const now = new Date();
    const localISO = now.getFullYear() +
      "-" + String(now.getMonth() + 1).padStart(2, '0') +
      "-" + String(now.getDate()).padStart(2, '0') +
      "T" + String(now.getHours()).padStart(2, '0') +
      ":" + String(now.getMinutes()).padStart(2, '0') +
      ":" + String(now.getSeconds()).padStart(2, '0');
    
    return localISO;
  }
  //console.log(getLocalISOTime()); // Example output: "2025-04-02T21:45:00"

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryGenvMetrics(paramData) {

    //let pointDateStartBucket = getDateDayInt(currDate)
    let startDate = new Date(metricsStartDate.value)
    console.log("startDate = "+startDate)
    //metricsStartDate.value = '2025-04-02T21:27'

    //let stopDate = metricsStopDate.value
    let stopDate = startDate
    let tempHours = parseInt(numHours.value)
    stopDate.setHours(startDate.getHours() + tempHours);
    console.log("stopDate = "+stopDate)
    let pointDateStartBucket = getDateInt(startDate.toISOString())
    let startDayTime = getHoursInt(startDate)
    let endDayTime = getHoursInt(stopDate)

    //let pointDayTime = getHoursInt(currDate,hours)
    //let currDate = new Date()
    //let pointMaxRows = 1500
    let pointMaxRows = 4000
    //let hours = -4
    // or could do Beginning Hour and Ending Hour

    // Return an integer of the date + hours (2024123101)
    //export function getDateInt(inDateStr) {
    //startDateQuery = `{ TakenFileTime: { gte: ${getDateInt(paramData.MediaFilterStartDate)} } }`


    /*
    startHour.value
    let formattedDate = td.substring(2,4) + 

    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
    }

    return(parseInt(formattedDate))
    */

    //startHour.value = 7
    //stopHour.value = 7
    //numHours.value = 2
    
    //let startDayTime = 25070000
    //let endDayTime = 25080000

    /*
    if (startHour.value < 10) {
        startDayTime = parseInt("250"+startHour.value+"0000")
    } else {
        startDayTime = parseInt("25"+startHour.value+"0000")
    }
    if (stopHour.value < 10) {
        endDayTime = parseInt("250"+stopHour.value+"0000")
    } else {
        endDayTime = parseInt("25"+stopHour.value+"0000")
    }
    */

    // "PointDayTime": 24060011,
//WHERE c.PointDay = 20250324 and c.PointDayTime > 25110600

    //                YYddHHmm
    //"PointDayTime": 24060011,
    //orderBy: { LastUpdateDateTime: ASC },

/*
    "PointDay": 20250324,
    "PointDateTime": "2025-03-24 10:58:23",
    "PointDayTime": 25105823,

type Joint @model {
  id: ID
  PointDay: Int
  PointDateTime: String
  PointDayTime: Int
  targetTemperature: 77,
  currTemperature: 75.88,
  airInterval: 1,
  airDuration: 0.1,
  heatInterval: 0.2,
  heatDuration: 9.5,
  relayName0: "lights",
  relayMetricValue0: 70,
  relayName1: "water",
  relayMetricValue1: 70,
  relayName2: "air",
  relayMetricValue2: 70,
  relayName3: "heat",
  relayMetricValue3: 74,

              orderBy: { PointDateTime: ASC },
            first: ${pointMaxRows}

  */
  let gql2 = `query {
        joints(
            filter: { 
                and: [ 
                    { PointDay: { eq: ${pointDateStartBucket} } }
                    { PointDayTime: { gte: ${startDayTime} } } 
                    { PointDayTime: { lt: ${endDayTime} } } 
                ] 
            },
            orderBy: { PointDateTime: ASC },
            first: ${pointMaxRows}
          ) {
              items {
                  PointDateTime
                    targetTemperature
                    currTemperature
                    airInterval
                    airDuration
                    heatInterval
                    heatDuration
                    relayName0
                    relayMetricValue0
                    relayName1
                    relayMetricValue1
                    relayName2
                    relayMetricValue2
                    relayName3
                    relayMetricValue3
              }
          }
    }`

    console.log("gql2 = "+gql2)

    const apiQuery2 = {
        query: gql2,
        variables: {
        }
    }


    showLoadingSpinner(getDataButton)
    const endpoint2 = "/data-api/graphql";
    const response = await fetch(endpoint2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery2)
    })
    const result = await response.json()
    getDataButton.innerHTML = getDataButtonHTML
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data = "+result.data)
        console.log("result.data # of joints = "+result.data.joints.items.length)
        //console.table(result.data.joints.items);
        //console.table(result.data.totals.items);
        //console.table(result.data.yearTotals.items);

        //"2024-05-10T11:51:34.6353964-04:00"
        let pointLocalDateTime = null
        let PointDateTime = ""

        let pointData = []
        if (result.data.joints.items.length > 0) {
            let cnt = 0
            result.data.joints.items.forEach((point) => {
                cnt++
                pointLocalDateTime = convertUTCDateToLocalDate(new Date(point.PointDateTime));
                PointDateTime = pointLocalDateTime.toISOString()
                //console.log(cnt+", PointDateTime: "+PointDateTime+", point.currTemperature: "+point.currTemperature)
                pointData.push({ 
                    time: PointDateTime.substring(11,16), 
                    currTemp: parseFloat(point.currTemperature) })
            })
        }

        if (pointData.length > 0) {
            displayCharts(pointData)
        }
    }
}

function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate;   
}

function displayCharts(pointData) {

    if (dailyTempChart == null) {
        //console.log(">>> create dailyTempChart")
        dailyTempChart = new Chart(dailyTempCanvas, {
            type: 'line',
            data: {
              labels: pointData.map(row => row.time),
              datasets: [{
                label: 'Tempature over time',
                data: pointData.map(row => row.currTemp),
                pointRadius: 0,
                borderWidth: 1,
                borderColor: 'rgb(218,165,32)',
                backgroundColor: 'gold',
                fill: true
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: false
                }
              }
            }
          })
    } else {
        //console.log(">>> UPDATE dailyTempChart")
        dailyTempChart.data.labels = pointData.map(row => row.time)
        dailyTempChart.data.datasets[0].data = pointData.map(row => row.currTemp)
        dailyTempChart.update()
    }
    
}

