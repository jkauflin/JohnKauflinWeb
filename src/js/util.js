/*==============================================================================
 * (C) Copyright 2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  Utility functions for javascript modules
 *----------------------------------------------------------------------------
 * Modification History
 * 2024-11-30 JJK   Added the showLoadingSpinner function to display a 
 *                  Loading... message with a built-in Bootstrap spinner
 * 2025-06-06 JJK   Added checkFetchResponse
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

export function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0'
    var pad = new Array(1 + padlen).join(pad_char)
    return (pad + num).slice(-pad.length)
}

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
    return td.toISOString().substring(0,10)  //2024-01-31T19:37:12.291Z
}

export function addHours(inDate, hours) {
  //let td = new Date(inDate)
  let td = inDate
  td.setHours(td.getHours() + (parseInt(hours)-4))  // Adjust for GMT time
  return td.toISOString().substring(0,19)
}

// Return an integer of the date + hours (2024123101)
export function getDateInt(inDateStr) {
    /*
    let td = new Date()
    if (inDate != null) {
        td = inDate
    }
    let tempMonth = td.getMonth() + 1
    let tempDay = td.getDate()
    let formattedDate = td.getFullYear() + paddy(tempMonth,2) + paddy(tempDay,2) + paddy(td.getHours(),2)
    */

    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
        if (inDateStr.length >= 13) {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + inDateStr.substring(11,13)
        } else {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + "00"
        }
    }

    return(parseInt(formattedDate))
}

// Return an integer of the date + hours (2024123101)
export function getDateDayInt(inDateStr) {
    /*
    let td = new Date()
    if (inDate != null) {
        td = inDate
    }
    let tempMonth = td.getMonth() + 1
    let tempDay = td.getDate()
    let formattedDate = td.getFullYear() + paddy(tempMonth,2) + paddy(tempDay,2) + paddy(td.getHours(),2)
    */

    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
        formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10)
    }

    return(parseInt(formattedDate))
}

export function getHoursInt(inDateStr) {
  let formattedDate = "1800-01-01 00:00:00"
  if (inDateStr != null) {
    formattedDate = inDateStr.substring(2,4) + inDateStr.substring(11,13) + inDateStr.substring(14,16) + inDateStr.substring(17,19)
  }
  return(parseInt(formattedDate))
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

    function formatDate(inDate) {
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

