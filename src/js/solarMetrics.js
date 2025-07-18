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
2025-06-29 JJK  Working on queries to make them quicker and more reliable
================================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,addDays,addHours,getDateInt,getDateDayInt,getHoursInt} from './util.js';

//var solarTileButton = document.getElementById("SolarTile");
//solarTileButton.addEventListener("click", querySolarMetrics);
const dailyWattsCanvas = document.getElementById('DailyWattsCanvas')
const dailyTotalsCanvas = document.getElementById('DailyTotalsCanvas')
const currVoltsGuage = document.getElementById('CurrVoltsGuage'); 
const currAmpsGuage = document.getElementById('CurrAmpsGuage'); 
const currWattsGuage = document.getElementById('CurrWattsGuage'); 
const pointDateTimeDiv = document.getElementById('PointDateTime'); 
const ytdWatts = document.getElementById('YtdWatts'); 
const totalsTbody = document.getElementById('TotalsTbody'); 
const totalsMaxTbody = document.getElementById('TotalsMaxTbody'); 

var gaugeVolts = null
var gaugeAmps = null
var gaugeWatts = null
var dailyWattsChart = null
var dailyTotalsChart = null

var getDataButton = document.getElementById("GetDataButton")
getDataButton.addEventListener("click", querySolarMetrics);

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function querySolarMetrics(paramData) {
    let currDate = new Date()
    let pointDate = addDays(currDate, -1)
    //let pointDateStartBucket = getDateInt(pointDate)
    let pointDateStartBucket = getDateDayInt(pointDate)

    // Start Points query at current date minus 3 hours
    //let pointHours = addHours(currDate, -3)
    let pointHours = addHours(currDate, -2)
    //let pointHours = addHours(currDate, -1)
    //let pointDayTime = parseInt(currDate.toISOString().substring(2,4) + "093000")
    //2024-01-31T19:37:12.291Z
    let pointDayTime = getHoursInt(pointHours)
    let pointMaxRows = 1500

    // Get Day totals starting 30 days back
    //let tempDays = 30
    let tempDays = 14
    let dayTotalStartDate = addDays(new Date(), -tempDays)
    //let dayTotalStartBucket = getDateInt(dayTotalStartDate)
    let dayTotalStartBucket = getDateDayInt(dayTotalStartDate)
    let dayTotalMaxRows = tempDays

    //"PointDayTime": 24060011,


    //orderBy: { LastUpdateDateTime: ASC },

    let solarQL = `query {
        points(
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
                  pvVolts
                  pvAmps
                  pvWatts
              }
        }
        totals(
            filter: { 
                and: [ 
                    { id: { eq: "DAY" } }
                    { TotalBucket: { gte: ${dayTotalStartBucket} } }
                ] 
            },
            orderBy: { TotalBucket: ASC },
            first: ${dayTotalMaxRows}
        ) {
            items {
                TotalBucket
                LastUpdateDateTime
                TotalValue
                AmpMaxValue
                WattMaxValue
            }
        }

        yearTotals(
            filter: { 
                and: [ 
                    { id: { eq: "YEAR" } }
                ] 
            },
            orderBy: { TotalBucket: ASC }
        ) {
              items {
                TotalBucket
                LastUpdateDateTime
                TotalValue
              }
        }
    }`
/*
          yearTotals(
            filter: { 
                and: [ 
                    { id: { eq: "YEAR" } }
                ] 
            },
            orderBy: { TotalBucket: ASC }
          ) {
              items {
                TotalBucket
                LastUpdateDateTime
                TotalValue
              }
          }
*/

    //console.log("solarQL = "+solarQL)

    const solarApiQuery = {
        query: solarQL,
        variables: {
        }
    }

    
    showLoadingSpinner(pointDateTimeDiv)
    try {
        const response = await fetch("/data-api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(solarApiQuery)
        })
        await checkFetchResponse(response)
        // Success
        let result = await response.json()
        //messageDisplay.textContent = ""
        empty(pointDateTimeDiv)
        //console.log("result.data = "+result.data)
        //console.log("result.data Points = "+result.data.points.items.length)
        //console.table(result.data.points.items);
        //console.table(result.data.totals.items);
        //console.table(result.data.yearTotals.items);

        displaySolarMetrics(result)

    } catch (err) {
        console.error(err)
        pointDateTimeDiv.textContent = `Error in Fetch: ${err.message}`
    }
}

function displaySolarMetrics(result) {
        let dayTotalData = []
        let dayTotalMaxData = []
        if (result.data.totals.items.length > 0) {
            let maxValStart = result.data.totals.items.length - 10
            let totCnt = 0
            let tempDateStr = ""
            result.data.totals.items.forEach((dayTotal) => {
                totCnt++
                dayTotalData.push({ 
                    date: dayTotal.LastUpdateDateTime.substring(5,10), 
                    total: parseFloat(dayTotal.TotalValue) 
                })

                // Save the last X number of max totals
                // 20240624
                tempDateStr = dayTotal.TotalBucket.toString()
                
                //date: dayTotal.LastUpdateDateTime.substring(5,10), 
                if (totCnt > maxValStart) {
                    dayTotalMaxData.push({ 
                        date: tempDateStr.substring(4,6) + "-" + tempDateStr.substring(6,8), 
                        ampMaxValue: parseFloat(dayTotal.AmpMaxValue), 
                        wattMaxValue: parseFloat(dayTotal.WattMaxValue) 
                    })
                }
            })
        }

        let lifetimeTotal = 0
        let totalsData = []
        if (result.data.yearTotals.items.length > 0) {
            result.data.yearTotals.items.forEach((yearTotal) => {
                //console.log("TotalBucket = "+yearTotal.TotalBucket+", LastUpdateDateTime = "+yearTotal.LastUpdateDateTime+", TotalValue = "+yearTotal.TotalValue)
                totalsData.push({ 
                    TotalBucket: yearTotal.TotalBucket,
                    TotalValue: yearTotal.TotalValue
                })
                lifetimeTotal += parseInt(yearTotal.TotalValue)
            })
        }
        //console.log("lifetimeTotal = "+lifetimeTotal)

        //"2024-05-10T11:51:34.6353964-04:00"
        let pointLocalDateTime = null
        let PointDateTime = ""
        let pvVoltsFloat = 0.0
        let pvAmpsFloat = 0.0
        let pvWattsFloat = 0.0

        let pointData = []
        let tempWatts = 0.0
        if (result.data.points.items.length > 0) {
            result.data.points.items.forEach((point) => {
                tempWatts = parseFloat(point.pvWatts)
                if (tempWatts > 0.0) {
                    pointLocalDateTime = convertUTCDateToLocalDate(new Date(point.PointDateTime));
                    PointDateTime = pointLocalDateTime.toISOString()
                    pointData.push({ 
                        time: PointDateTime.substring(11,16), 
                        watts: parseFloat(point.pvWatts) })

                    // Save to get the values for the last record
                    pvVoltsFloat = parseFloat(point.pvVolts)
                    pvAmpsFloat = parseFloat(point.pvAmps)
                    pvWattsFloat = parseFloat(point.pvWatts)
                }
            })
        }

        /*
        (index)
        TotalBucket
        LastUpdateDateTime
        TotalValue
        0	20240413	'2024-04-13T20:59:46.8069446-04:00'	'12.2'
        1	20240414	'2024-04-14T20:59:46.8069446-04:00'	'9.9'
        */

        //console.log("Title = "+result.data.book_by_pk.Title)
        /*
        console.log("data.mtype_by_pk.MediaTypeDesc = "+result.data.mtype_by_pk.MediaTypeDesc);
        console.log("data.mtype_by_pk.Category[0].CategoryName = "+result.data.mtype_by_pk.Category[0].CategoryName);
        if (result.data.mtype_by_pk.Category[0].Menu != null) {
            console.log("data.mtype_by_pk.Category[0].Menu[0].MenuItem = "+result.data.mtype_by_pk.Category[0].Menu[0].MenuItem);
        }
        */

        displayGauges(PointDateTime,pvVoltsFloat,pvAmpsFloat,pvWattsFloat)
        if (pointData.length > 0) {
            displayCharts(pointData,dayTotalData)
        }
        if (totalsData.length > 0) {
            displayTotals(totalsData,lifetimeTotal)
        }
        if (dayTotalMaxData.length > 0) {
            displayTotalsMax(dayTotalMaxData)
        }
}

function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate;   
}

function displayGauges(PointDateTime,pvVoltsFloat,pvAmpsFloat,pvWattsFloat) {
    if (gaugeVolts == null) {
        gaugeVolts = new Gauge(currVoltsGuage).setOptions(optsVolts)
        document.getElementById("CurrVoltsVal").className = "preview-textfield";
        gaugeVolts.setTextField(document.getElementById("CurrVoltsVal"),2);
        gaugeVolts.maxValue = 160.0;
        gaugeVolts.setMinValue(0); 
        gaugeVolts.animationSpeed = 32
    }
  
    if (gaugeAmps == null) {
        gaugeAmps = new Gauge(currAmpsGuage).setOptions(optsAmps)
        document.getElementById("CurrAmpsVal").className = "preview-textfield";
        gaugeAmps.setTextField(document.getElementById("CurrAmpsVal"),2);
        gaugeAmps.maxValue = 17.0;
        gaugeAmps.setMinValue(0); 
        gaugeAmps.animationSpeed = 32
    }

    if (gaugeWatts == null) {
        gaugeWatts = new Gauge(currWattsGuage).setOptions(optsWatts)
        document.getElementById("CurrWattsVal").className = "preview-textfield";
        gaugeWatts.setTextField(document.getElementById("CurrWattsVal"),2);
        gaugeWatts.maxValue = 2100.0;
        gaugeWatts.setMinValue(0); 
        gaugeWatts.animationSpeed = 32
    }
  
    pointDateTimeDiv.innerHTML = PointDateTime.substring(0,10) + " " + PointDateTime.substring(11,19)
    gaugeVolts.set(pvVoltsFloat);
    gaugeAmps.set(pvAmpsFloat.toFixed(2));
    gaugeWatts.set(pvWattsFloat);
}


function displayCharts(pointData,dayTotalData) {

    if (dailyWattsChart == null) {
        //console.log(">>> create dailyWattsChart")
        dailyWattsChart = new Chart(dailyWattsCanvas, {
            type: 'line',
            data: {
              labels: pointData.map(row => row.time),
              datasets: [{
                label: 'Watts over time',
                data: pointData.map(row => row.watts),
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
                  beginAtZero: true
                }
              }
            }
          })
    } else {
        //console.log(">>> UPDATE dailyWattsChart")
        dailyWattsChart.data.datasets[0].data = pointData.map(row => row.watts)
        dailyWattsChart.update()
    }
    
    if (dailyTotalsChart == null) {
        //console.log(">>> create dailyTotalsChart")
        dailyTotalsChart = new Chart(dailyTotalsCanvas, {
            type: 'bar',
            data: {
              labels: dayTotalData.map(row => row.date),
              datasets: [{
                label: 'kWh per Day',
                data: dayTotalData.map(row => row.total),
                backgroundColor: 'gold',
                borderColor: 'rgb(218,165,32)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          })
    }  else {
        //console.log(">>> UPDATE dailyTotalsChart")
        dailyTotalsChart.data.datasets[0].data = dayTotalData.map(row => row.total)
        dailyTotalsChart.update()
    }

}

function displayTotals(totalsData,lifetimeTotal) {
    empty(totalsTbody)
    let tr = null
    let td = null
    let ytdWattsVal = 0
    totalsData.forEach((tot) => {
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = tot.TotalBucket
        tr.appendChild(td);

        td = document.createElement("td");
        td.innerHTML = parseInt(tot.TotalValue)
        tr.appendChild(td);
        totalsTbody.appendChild(tr)
        ytdWattsVal = parseInt(tot.TotalValue)
    })

    ytdWatts.innerHTML = "YTD Watts: " + ytdWattsVal + " kWh"

    tr = document.createElement("tr");
    td = document.createElement("td");
    td.innerHTML = "Total"
    tr.appendChild(td);

    td = document.createElement("td");
    //td.innerHTML = lifetimeTotal + " kWh"
    td.innerHTML = lifetimeTotal
    tr.appendChild(td);
    totalsTbody.appendChild(tr)
}

function displayTotalsMax(dayTotalMaxData) {
    empty(totalsMaxTbody)
    let tr = null
    let td = null
    dayTotalMaxData.forEach((max) => {
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.innerHTML = max.date
        tr.appendChild(td);

        td = document.createElement("td");
        td.innerHTML = max.ampMaxValue
        tr.appendChild(td);

        td = document.createElement("td");
        td.innerHTML = max.wattMaxValue
        tr.appendChild(td);

        totalsMaxTbody.appendChild(tr)
    })
}


var optsVolts = {
    // color configs
    colorStart: "#6fadcf",
    colorStop: void 0,
    gradientType: 0,
    strokeColor: "#e0e0e0",
    generateGradient: true,
    percentColors: [[0.0, "#a9d70b" ], [0.50, "#f9c802"], [1.0, "#ff0000"]],
    // customize pointer
    pointer: {
        length: 0.8,
        strokeWidth: 0.035,
        iconScale: 3.0
    },
    // static labels
    staticLabels: {
      font: "12px sans-serif",
      labels: [20, 40, 70, 100, 125, 145],
      fractionDigits: 0
    },
    // static zones
    staticZones: [
      {strokeStyle: "#30B32D", min: 0, max: 125},
      {strokeStyle: "#FFDD00", min: 125, max: 140},
      {strokeStyle: "#F03E3E", min: 140, max: 160}
    ],
    // render ticks
    renderTicks: {
      divisions: 3,
      divWidth: 1.1,
      divLength: 0.7,
      divColor: "#333333",
      subDivisions: 3,
      subLength: 0.5,
      subWidth: 0.6,
      subColor: "#666666"
    },
    // the span of the gauge arc
    //angle: 0.15,
    angle: 0.00,
    // line thickness
    //lineWidth: 0.44,
    lineWidth: 0.5,
    // radius scale
    //radiusScale: 1.0,
    radiusScale: 1.0,
    // font size
    fontSize: 40,
    // if false, max value increases automatically if value > maxValue
    limitMax: false,
    // if true, the min value of the gauge will be fixed
    limitMin: false,
    // High resolution support
    highDpiSupport: true
}

var optsAmps = {
    // color configs
    colorStart: "#6fadcf",
    colorStop: void 0,
    gradientType: 0,
    strokeColor: "#e0e0e0",
    generateGradient: true,
    percentColors: [[0.0, "#a9d70b" ], [0.50, "#f9c802"], [1.0, "#ff0000"]],
    // customize pointer
    pointer: {
      length: 0.8,
      strokeWidth: 0.035,
      iconScale: 3.0
    },
    // static labels
    staticLabels: {
      font: "12px sans-serif",
      labels: [1, 3, 5, 7, 9, 11, 13, 15, 17],
      fractionDigits: 0
    },
    // static zones
    staticZones: [
        {strokeStyle: "#30B32D", min: 0, max: 13},
        {strokeStyle: "#FFDD00", min: 13, max: 15},
        {strokeStyle: "#F03E3E", min: 15, max: 17}
    ],
    // render ticks
    renderTicks: {
      divisions: 3,
      divWidth: 1.1,
      divLength: 0.7,
      divColor: "#333333",
      subDivisions: 3,
      subLength: 0.5,
      subWidth: 0.6,
      subColor: "#666666"
    },
    // the span of the gauge arc
    //angle: 0.15,
    angle: 0.00,
    // line thickness
    //lineWidth: 0.44,
    lineWidth: 0.5,
    // radius scale
    //radiusScale: 1.0,
    radiusScale: 1.0,
    // font size
    fontSize: 40,
    // if false, max value increases automatically if value > maxValue
    limitMax: false,
    // if true, the min value of the gauge will be fixed
    limitMin: false,
    // High resolution support
    highDpiSupport: true
}

var optsWatts = {
    // color configs
    colorStart: "#6fadcf",
    colorStop: void 0,
    gradientType: 0,
    strokeColor: "#e0e0e0",
    generateGradient: true,
    percentColors: [[0.0, "#a9d70b" ], [0.50, "#f9c802"], [1.0, "#ff0000"]],
    // customize pointer
    pointer: {
      length: 0.8,
      strokeWidth: 0.035,
      iconScale: 3.0
    },
    // static labels
    staticLabels: {
      font: "12px sans-serif",
      labels: [500, 1000, 1500, 2000],
      fractionDigits: 0
    },
    // static zones
    staticZones: [
      {strokeStyle: "#30B32D", min: 0, max: 1900},
      {strokeStyle: "#FFDD00", min: 1900, max: 2000},
      {strokeStyle: "#F03E3E", min: 2000, max: 2100}
    ],
    // render ticks
    renderTicks: {
      divisions: 3,
      divWidth: 1.1,
      divLength: 0.7,
      divColor: "#333333",
      subDivisions: 3,
      subLength: 0.5,
      subWidth: 0.6,
      subColor: "#666666"
    },
    // the span of the gauge arc
    //angle: 0.15,
    angle: 0.00,
    // line thickness
    //lineWidth: 0.44,
    lineWidth: 0.5,
    // radius scale
    //radiusScale: 1.0,
    radiusScale: 1.0,
    // font size
    fontSize: 40,
    // if false, max value increases automatically if value > maxValue
    limitMax: false,
    // if true, the min value of the gauge will be fixed
    limitMin: false,
    // High resolution support
    highDpiSupport: true
}

