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

import {empty,showLoadingSpinner,addDays,addHours,getDateInt,getDateDayInt,getHoursInt} from './util.js';

//var solarTileButton = document.getElementById("SolarTile");
//solarTileButton.addEventListener("click", querySolarMetrics);
const dailyTempCanvas = document.getElementById('DailyTempCanvas')
const pointDateTimeDiv = document.getElementById('PointDateTime'); 
const ytdWatts = document.getElementById('YtdWatts'); 

var dailyTempChart = null

var getDataButton = document.getElementById("GetDataButton")
getDataButton.addEventListener("click", queryGenvMetrics);

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryGenvMetrics(paramData) {
    let currDate = new Date()
    let pointDate = addDays(currDate, -1)
    //let pointDateStartBucket = getDateInt(pointDate)
    let pointDateStartBucket = getDateDayInt(pointDate)

    // Start Points query at current date minus 3 hours
    //let pointHours = addHours(currDate, -3)
    let pointHours = addHours(currDate, -2)
    //let pointDayTime = parseInt(currDate.toISOString().substring(2,4) + "093000")
    //2024-01-31T19:37:12.291Z
    let pointDayTime = getHoursInt(pointHours)
    let pointMaxRows = 1500

    //"PointDayTime": 24060011,
    //orderBy: { LastUpdateDateTime: ASC },

/*
type Joint @model {
  id: ID
  PointDay: Int
  PointDateTime: String
  PointDayTime: Int
  targetTemperature: 77,
  currTemperature: "75.88",
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
                    { PointDayTime: { gte: ${pointDayTime} } } 
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

    showLoadingSpinner(pointDateTimeDiv)
    const endpoint2 = "/data-api/graphql";
    const response = await fetch(endpoint2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery2)
    })
    const result = await response.json()
    empty(pointDateTimeDiv)
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data = "+result.data)
        //console.log("result.data Points = "+result.data.joints.items.length)
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
        dailyTempChart.data.datasets[0].data = pointData.map(row => row.currTemp)
        dailyTempChart.update()
    }
    
}

