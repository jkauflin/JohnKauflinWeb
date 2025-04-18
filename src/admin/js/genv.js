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
2025-04-02 JJK  Working on start and stop date and time - realized it was more
                complicated to convert to datetime and use date match functions
                Just kept it simple with a start date and start & stop hours
2025-04-12 JJK  Adding average calculations
================================================================================*/

import {empty,showLoadingSpinner,convertUTCDateToLocalDate,formatDate,addDays,addHours,getDateInt,getDateDayInt,getHoursInt} from './util.js';

const dailyTempCanvas = document.getElementById("DailyTempCanvas")
var dailyTempChart = null
var metricsStartDate = document.getElementById("MetricsStartDate")
var startHour = document.getElementById("StartHour")
var stopHour = document.getElementById("StopHour")
var getDataButton = document.getElementById("GetDataButton")
var getDataButtonHTML = '<i class="fa fa-area-chart me-1"></i> Get Data'
getDataButton.innerHTML = getDataButtonHTML
getDataButton.addEventListener("click", queryGenvMetrics);

var currDT = new Date()
metricsStartDate.value = currDT.toISOString().split('T')[0];
startHour.value = 0
stopHour.value = 24

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryGenvMetrics(paramData) {
    //console.log("metricsStartDate.value = "+metricsStartDate.value)
    let dateStr = metricsStartDate.value
    let pointDateStartBucket = getDateInt(metricsStartDate.value)
    let startDayTime = parseInt(dateStr.substring(2,4) + startHour.value.padStart(2,'0') + "0000")
    let endDayTime = parseInt(dateStr.substring(2,4) + stopHour.value.padStart(2,'0') + "0000")
    let pointMaxRows = 5000

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

    //console.log("gql2 = "+gql2)

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
        //console.log("result.data # of joints = "+result.data.joints.items.length)

        let numOfDataPoints = result.data.joints.items.length
        let avgGrandTotal = 0.0
        let average = 0.0
        let pointLocalDateTime = null
        let PointDateTime = ""

        let pointData = []
        if (numOfDataPoints > 0) {
            let cnt = 0
            //let numPointsForAvg = 50.0
            let numPointsForAvg = numOfDataPoints / 20
            //console.log(">>> numPointsForAvg = "+numPointsForAvg)

            result.data.joints.items.forEach((point) => {
                avgGrandTotal += point.currTemperature
            })
            average = avgGrandTotal / numOfDataPoints
            //console.log("$$$$$ average = "+average)

            let avgCnt = 0
            let avgTotal = result.data.joints.items[0].currTemperature
            let avgValue = result.data.joints.items[0].currTemperature  // Start it out at the 1st value
            result.data.joints.items.forEach((point) => {
                cnt++
                pointLocalDateTime = convertUTCDateToLocalDate(new Date(point.PointDateTime));
                PointDateTime = pointLocalDateTime.toISOString()

                /*
                avgCnt++
                avgTotal += point.currTemperature
                // every X points
                if (avgCnt == numPointsForAvg-1) {
                    avgValue = avgTotal / numPointsForAvg
                    avgCnt = 0
                    avgTotal = point.currTemperature
                }
                //console.log(cnt+", "+PointDateTime+", currTemp: "+point.currTemperature+", avgCnt: "+avgCnt+", avgTotal: "+avgTotal+", avgValue: "+avgValue)
                */

                pointData.push({ 
                    time: PointDateTime.substring(11,16), 
                    currTemp: parseFloat(point.currTemperature),
                    avgTemp: average })
                    //avgTemp: parseFloat(avgValue) })
            })
        }

        if (pointData.length > 0) {
            displayCharts(pointData)
        }
    }
}


function displayCharts(pointData) {

    // create the 2nd dataset by taking the average of X number of data points (like every 10 or 100?)

    if (dailyTempChart == null) {
        //console.log(">>> create dailyTempChart")
        dailyTempChart = new Chart(dailyTempCanvas, {
            type: 'line',
            data: {
              labels: pointData.map(row => row.time),
              datasets: [
                {
                    label: 'Average Tempature',
                    data: pointData.map(row => row.avgTemp),
                    pointRadius: 0,
                    borderWidth: 1,
                    borderColor: 'red',
                },
                {
                    label: 'Tempature over time',
                    data: pointData.map(row => row.currTemp),
                    pointRadius: 0,
                    borderWidth: 1,
                    borderColor: 'rgb(218,165,32)',
                    backgroundColor: 'gold',
                    fill: true
                }
            ]
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
        dailyTempChart.data.datasets[0].data = pointData.map(row => row.avgTemp)
        dailyTempChart.data.datasets[1].data = pointData.map(row => row.currTemp)
        dailyTempChart.update()
    }
    
}

