/*==============================================================================
 * (C) Copyright 2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  Utility functions for javascript modules
 *----------------------------------------------------------------------------
 * Modification History
 * 2024-11-30 JJK   Added the showLoadingSpinner function to display a 
 *                  Loading... message with a built-in Bootstrap spinner
 *============================================================================*/

//=================================================================================================================
// Variables cached from the DOM

var spanSpinner = document.createElement("span")
spanSpinner.classList.add("spinner-grow","spinner-grow-sm","me-2")
spanSpinner.setAttribute("aria-hidden","true")
var spanSpinnerStatus = document.createElement("span")
spanSpinnerStatus.setAttribute("role","status")
spanSpinnerStatus.textContent = "Loading..."

//=================================================================================================================
// Module methods
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

export function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0'
    var pad = new Array(1 + padlen).join(pad_char)
    return (pad + num).slice(-pad.length)
}

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

export function formatDate(inDate) {
    var td = inDate;
    if (td == null) {
        td = new Date();
    }
    let dateStr = td.toISOString()  //2024-01-31T19:37:12.291Z
    return(dateStr.substring(0,10))
}

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


    function formatDate2(inDate) {
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
    function setCheckbox(checkVal) {
        var tempStr = '';
        if (checkVal == 1) {
            tempStr = 'checked=true';
        }
        return '<input type="checkbox" ' + tempStr + ' disabled="disabled">';
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

