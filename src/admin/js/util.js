/*==============================================================================
 * (C) Copyright 2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  Utility functions for javascript modules
 *----------------------------------------------------------------------------
 * Modification History
 * 2024-11-30 JJK   Added the showLoadingSpinner function to display a 
 *                  Loading... message with a built-in Bootstrap spinner
 * 2025-05-23 JJK   Adding checkbox again
 *============================================================================*/

//=================================================================================================================
// Variables cached from the DOM

var spanSpinner
var spanSpinnerStatus

document.addEventListener('DOMContentLoaded', () => {
    spanSpinner = document.createElement("span")
    spanSpinner.classList.add("spinner-grow","spinner-grow-sm","me-2")
    spanSpinner.setAttribute("aria-hidden","true")
    spanSpinnerStatus = document.createElement("span")
    spanSpinnerStatus.setAttribute("role","status")
    spanSpinnerStatus.textContent = "Loading..."
})

//=================================================================================================================
// Module methods

export async function checkFetchResponse(response) {
    if (!response.ok) {
        let errMessage = "Error unknown"
        if (response.statusText != "") {
            errMessage = response.statusText
        }
        try {
            let responseText = await response.text()
            if (responseText != "") {
                errMessage = responseText
            }
            // Check if there is a JSON structure in the response (which contains errors)
            const result = JSON.parse(errMessage)
            if (result.errors != null) {
                console.log("Error: "+result.errors[0].message)
                console.table(result.errors)
                errMessage = result.errors[0].message
            }
        } catch (err) {
            // Ignore JSON parse errors from trying to find structures in the response
        }
        throw new Error(errMessage)
    } 
}

export function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate;   
}

export function getESTTime(date) {
    // Create a new Date object based on the input date
    let inputDate = new Date(date);

    // Format the date to EST/EDT using the Intl.DateTimeFormat API
    let options = {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    let formatter = new Intl.DateTimeFormat('en-US', options);
    let parts = formatter.formatToParts(inputDate);

    // Extract and return the formatted date parts
    let formattedDate = parts.reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    return `${formattedDate.year}-${formattedDate.month}-${formattedDate.day} ${formattedDate.hour}:${formattedDate.minute}:${formattedDate.second}`;
}

export function showLoadingSpinner(docElement) {
    empty(docElement)
    docElement.appendChild(spanSpinner)            
    docElement.appendChild(spanSpinnerStatus)            
}
       
// Remove all child nodes from an element
export function empty(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }
}


export function setTD(tdType,value,classStr="") {
    let td = document.createElement("td")
    if (classStr != "") {
        // The .split(" ") method converts the string into an array of class names
        // The spread operator (...) ensures each class is added individually
        td.classList.add(...classStr.split(" "))
    }
    if (tdType == "text") {
        td.textContent = value
    } else if (tdType == "date") {
        td.textContent = standardizeDate(value)
    } else if (tdType == "money") {
        td.textContent = formatMoney(value)
    } else if (tdType == "checkbox") {
        let checkbox = document.createElement("input");
        checkbox.type = tdType;
        checkbox.classList.add('form-check-input','shadow-none')
        checkbox.checked = (value == 1) ? checkbox.checked = true : false
        checkbox.disabled = true;
        td.appendChild(checkbox)
    }
    return td
}

export function setCheckbox(checkVal) {
    var tempStr = '';
    if (checkVal == 1) {
        tempStr = 'checked=true';
    }
    return '<input type="checkbox" ' + tempStr + ' disabled="disabled">';
}

function standardizeDate(dateStr) {
    let outDateStr = dateStr
    const containsSlash = dateStr.includes("/")
    if (containsSlash) {
        const [month, day, year] = slashDate.split("/")
        outDateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
    return outDateStr
}

export function formatDate(inDate) {
    var tempDate = inDate;
    if (tempDate == null) {
        tempDate = new Date();
    }
    var tempMonth = tempDate.getMonth() + 1;
    if (tempDate.getMonth() < 9) {
        tempMonth = '0' + (tempDate.getMonth() + 1);
    }
    var tempDay = tempDate.getDate();
    if (tempDate.getDate() < 10) {
        tempDay = '0' + tempDate.getDate();
    }
    return tempDate.getFullYear() + '-' + tempMonth + '-' + tempDay;
}


export function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0'
    var pad = new Array(1 + padlen).join(pad_char)
    return (pad + num).slice(-pad.length)
}

export function getLocalISOTime() {
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

export function addDays(inDate, days) {
    //let td = new Date(inDate)
    let td = inDate
    td.setDate(td.getDate() + (parseInt(days)+1))
    /*
    let tempMonth = td.getMonth() + 1
    let tempDay = td.getDate()
    let outDate = td.getFullYear() + '-' + paddy(tempMonth,2) + '-' + paddy(tempDay,2)
    */
    /*
    const dateTimeFormatOptions = {
        //timeZone: "Africa/Accra",
        //hour12: true,
        //hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };
    */
    //return tempDate.toLocaleTimeString("en-US", dateTimeFormatOptions)
    //return outDate;
    //return tempDate.toLocaleDateString("en-US", dateTimeFormatOptions)
    //return td.toLocaleDateString()
    //return td.toISOString().substring(0,10)  //2024-01-31T19:37:12.291Z
    
    //return td.toISOString()  //2024-01-31T19:37:12.291Z
    return td.toLocaleDateString()
}

export function addHours(inDate, hours) {
  //let td = new Date(inDate)
  let td = inDate
  td.setHours(td.getHours() + (parseInt(hours)-4))  // Adjust for GMT time
  return td.toISOString().substring(0,19)
}

// Return an integer of the date (20241231) from input of a Date object, and days to add
export function getDateDayInt(inDate, days=0) {
    let td = new Date()
    if (inDate != null) {
        td = inDate
    }

    // Add or Subtract days if passed
    if (days != 0) {
        td.setDate(td.getDate() + parseInt(days))
    }

    let dateStr = td.toISOString()  //2024-01-31T19:37:12.291Z
    let formattedDate = "1800-01-01 00:00:00"
    if (dateStr != null) {
        formattedDate = dateStr.substring(0,4) + dateStr.substring(5,7) + dateStr.substring(8,10)
    }

    return(parseInt(formattedDate))
}

// Return an integer of the date + hours (2024123101)   NO - just date
export function getDateInt(inDateStr) {
    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
        formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) 
    }

    return(parseInt(formattedDate))
}

export function getHoursInt(inDate,startHour=7,numHours=2) {
    let td = new Date()
    if (inDate != null) {
        td = inDate
    }

    //td.setHours(td.getHours() + (parseInt(hours)-gmtAdjustment))  // Adjust for GMT time

    let dateStr = td.toISOString()  //2024-01-31T19:37:12.291Z

    //"PointDayTime": 24060011,

    // Example usage
    //let gmtDate = new Date('2025-01-26T12:00:00Z'); // GMT date
    //console.log(getESTTime(gmtDate)); // Convert GMT to EST/EDT


    let formattedDate = "1800-01-01 00:00:00"
    if (dateStr != null) {
        formattedDate = dateStr.substring(2,4) + dateStr.substring(11,13) + dateStr.substring(14,16) + dateStr.substring(17,19)
    }
    return(parseInt(formattedDate))
}

export function daysFromDate(dateStr) {
    let date1 = new Date(dateStr);
    let date2 = new Date();

    // getTime() returns the number of milliseconds since January 1, 1970 00:00:00
    // Calculating the time difference
    // of two dates
    let Difference_In_Time =
        date2.getTime() - date1.getTime();
     
    // Calculating the no. of days between
    // two dates
    let Difference_In_Days =
        Math.round
            (Difference_In_Time / (1000 * 3600 * 24));
     
    // To display the final no. of days (result)
    /*
    console.log
        ("Total number of days between dates:\n" +
            date1.toDateString() + " and " +
            date2.toDateString() +
            " is: " + Difference_In_Days + " days");    
    */
   
    return(Difference_In_Days-1)
}

/*
export function formatDate(inDate) {
    var td = inDate;
    if (td == null) {
        td = new Date();
    }
    let dateStr = td.toISOString()  //2024-01-31T19:37:12.291Z
    return(dateStr.substring(0,10))
}
*/

    function urlParam(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        }
        else {
            return results[1] || 0;
        }
    }
    /*
    example.com?param1=name&param2=&id=6
        urlParam('param1');     // name
        urlParam('id');         // 6
        rlParam('param2');      // null
    */

    // Non-Printable characters - Hex 01 to 1F, and 7F
    var nonPrintableCharsStr = "[\x01-\x1F\x7F]";
    // "g" global so it does more than 1 substitution
    var regexNonPrintableChars = new RegExp(nonPrintableCharsStr, "g");
    function cleanStr(inStr) {
        return inStr.replace(regexNonPrintableChars, '');
    }

    // Filter out commas (for CSV outputs)
    var commaHexStr = "[\x2C]";
    var regexCommaHexStr = new RegExp(commaHexStr, "g");
    function csvFilter(inVal) {
        return inVal.toString().replace(regexCommaHexStr, '');
    }

    //Replace every ascii character except decimal and digits with a null, and round to 2 decimal places
    var nonMoneyCharsStr = "[\x01-\x2D\x2F\x3A-\x7F]";
    //"g" global so it does more than 1 substitution
    var regexNonMoneyChars = new RegExp(nonMoneyCharsStr, "g");
    function formatMoney(inAmount) {
        var inAmountStr = '' + inAmount;
        inAmountStr = inAmountStr.replace(regexNonMoneyChars, '');
        return parseFloat(inAmountStr).toFixed(2);
    }


    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function formatDateMonth(inDate) {
        var tempDate = inDate;
        if (tempDate == null) {
            tempDate = new Date();
        }
        return months[tempDate.getMonth()] + ' ' + tempDate.getDate() + ', ' + tempDate.getFullYear();
    }


    // Helper functions for setting UI components from data
    function setBoolText(inBool) {
        var tempStr = "NO";
        if (inBool) {
            tempStr = "YES";
        }
        return tempStr;
    }
    //function setCheckboxEdit(checkVal, idName) {
    function setCheckboxEdit(idName, checkVal) {
        var tempStr = '';
        if (checkVal == 1) {
            tempStr = 'checked=true';
        }
        return '<input id="' + idName + '" type="checkbox" ' + tempStr + '>';
    }
    function setInputText(idName, textVal, textSize) {
        return '<input id="' + idName + '" name="' + idName + '" type="text" class="form-control input-sm resetval" value="' + textVal + '" size="' + textSize + '" maxlength="' + textSize + '">';
    }
    function setTextArea(idName, textVal, rows) {
        return '<textarea id="' + idName + '" class="form-control input-sm" rows="' + rows + '">' + textVal + '</textarea>';
    }
    function setTextArea2(idName, textVal, rows, cols) {
        return '<textarea id="' + idName + '" class="form-control input-sm" rows="' + rows + '" cols="' + cols + '">' + textVal + '</textarea>';
    }
    function setInputDate(idName, textVal, textSize) {
        return '<input id="' + idName + '" type="text" class="form-control input-sm Date" value="' + textVal + '" size="' + textSize + '" maxlength="' + textSize + '" placeholder="YYYY-MM-DD">';
    }
    function setSelectOption(optVal, displayVal, selected, bg) {
        var tempStr = '';
        if (selected) {
            tempStr = '<option class="' + bg + '" value="' + optVal + '" selected>' + displayVal + '</option>';
        } else {
            tempStr = '<option class="' + bg + '" value="' + optVal + '">' + displayVal + '</option>';
        }
        return tempStr;
    }

