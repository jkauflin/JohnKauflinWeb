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
================================================================================*/

import {empty,showLoadingSpinner,formatDate,addDays,addHours,getDateInt,getDateDayInt,getHoursInt} from './util.js';

//var solarTileButton = document.getElementById("SolarTile");
//solarTileButton.addEventListener("click", querySolarMetrics);
const dailyTempCanvas = document.getElementById("DailyTempCanvas")
var dailyTempChart = null
var metricsStartDate = document.getElementById("MetricsStartDate")
var startHour = document.getElementById("StartHour")
var numHours = document.getElementById("NumHours")
var getDataButton = document.getElementById("GetDataButton")
var getDataButtonHTML = '<i class="fa fa-area-chart me-1"></i> Get Data'
getDataButton.innerHTML = getDataButtonHTML
getDataButton.addEventListener("click", queryGenvMetrics);

metricsStartDate.value = formatDate()
startHour.value = 7
numHours.value = 2

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

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryGenvMetrics(paramData) {

    //let pointDateStartBucket = getDateDayInt(currDate)
    let startDate = metricsStartDate.value
    
    startDate.substring(0,10)

    let pointDateStartBucket = getDateInt(startDate)

    let currDate = new Date()
    //let pointMaxRows = 1500
    let pointMaxRows = 2000
    let hours = -4
    // or could do Beginning Hour and Ending Hour

    //startHour.value = 7
    //numHours.value = 2

    // create


// Return an integer of the date + hours (2024123101)
//export function getDateInt(inDateStr) {
//startDateQuery = `{ TakenFileTime: { gte: ${getDateInt(paramData.MediaFilterStartDate)} } }`


    //let pointDayTime = getHoursInt(currDate,hours)

    /*
    startHour.value
    let formattedDate = td.substring(2,4) + 

    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
    }

    return(parseInt(formattedDate))
    */

    startHour.value = 7
    numHours.value = 2
    

    let startDayTime = 25070000
    let endDayTime = 25080000
    // "PointDayTime": 24060011,

    //                YYddHHmm
    //"PointDayTime": 24060011,
    //orderBy: { LastUpdateDateTime: ASC },

/*
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
            result.data.joints.items.forEach((point) => {
                pointLocalDateTime = convertUTCDateToLocalDate(new Date(point.PointDateTime));
                PointDateTime = pointLocalDateTime.toISOString()
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
        console.log(">>> create dailyTempChart")
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
        dailyTempChart.data.datasets[0].data = pointData.map(row => row.currTemp)
        dailyTempChart.update()
    }
    
}

