/*==============================================================================
(C) Copyright 2023,2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Main module to handle interactions with database and file system
                as well as keeping mediaInfo and menu data structures
--------------------------------------------------------------------------------
Modification History
2023-08-06 JJK  Initial version - moved MediaInfo components to this module
2023-09-08 JJK  Renamed to DataRepository to show its function
2023-09-30 JJK  Adjusted location parameters for albumKey handling
--------------------------------------------------------------------------------
2024-03-29 JJK  Migrating to Azure SWA, blob storage, Cosmos DB with GraphQL
                for queries.  Also, removing Admin functions to make this just
                the presentation functions with no edit
2024-04-04 JJK  Finally got a good structure for MediaInfo container in
                Cosmos DB and got all of the records copied.  Now able to
                do GraphQL queries with "gte" on TakenFileTime integer,
                contains on strings, orderBy on Taken, and first maxRows
2024-06-20 JJK  Getting an error from Azure on the MediaType query, so I've
                hard-coded the categories and menu items for now
2024-06-25 JJK  Added setMenuFilter to set the menuFilter array based on a
                CategoryName (and MediaType)
2024-08-08 JJK  Added an API call to get people list
2024-12-02 JJK  Added util module and spinner for loading... mediaPageMessage
2025-10-24 JJK  Refactored to use new function API endpoint instead of data-api
2025-10-30 JJK  Adjusting logic for media queries
2025-11-01 JJK  Re-adding admin update functions
================================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,addDays,getDateInt} from './util.js';
import {createMediaPage,displayCurrFileList,updateAdminMessage} from './mg-create-pages.js';
import {mediaAlbumMenuCanvasId,buildAlbumMenuElements} from './mg-album.js'
import {setMenuList} from './mg-menu.js';
import {setAlbumList,getAlbumName} from './mg-album.js';
export let mediaInfo = {
    menuList: [],
    filterList: [],
    fileList: [],
    startDate: "",
    menuOrAlbumName: ""}
export let mediaType = 1
export let mediaTypeDesc = "Photos"
export let contentDesc = ""

export var queryCategory = ""
export var querySearchStr = ""
export var queryMenuItem = ""
export var queryAlbumKey = ""

export var categoryList = []
let defaultCategory = "1 John J Kauflin"

export var menuFilter = []
export var peopleList = []

// Look into using environment variables for this (like secrets for Azure credentials)
let photosUri = "https://jjkwebstorage.blob.core.windows.net/photos/"
let thumbsUri = "https://jjkwebstorage.blob.core.windows.net/thumbs/"
let musicUri = "https://jjkwebstorage.blob.core.windows.net/music/"

var MediaPageMessage
document.addEventListener('DOMContentLoaded', () => {
    MediaPageMessage = document.getElementById("MediaPageMessage")
})

export function setMediaType(inMediaType) {
    mediaType = parseInt(inMediaType)
}

export function getFilePath(index,descMod="",fullPath=false) {
    // descMod could be "Thumbs" or "Smaller"
    let fi = mediaInfo.fileList[index]

    if (mediaType == 3) {
        return musicUri + fi.name
    } else {
        if (descMod == "Thumbs") {
            return thumbsUri + fi.name
        } else {
            return photosUri + fi.name
        }
    }
}

export function getFileName(index) {
    let fi = mediaInfo.fileList[index]
    let fileNameNoExt = fi.name
    if (mediaType == 3 && fi.title != '') {
        fileNameNoExt = fi.title
    }
    let periodPos = fileNameNoExt.indexOf(".");
    if (periodPos >= 0) {
        fileNameNoExt = fileNameNoExt.substr(0,periodPos);
    }
    return fileNameNoExt
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryMediaInfo(paramData) {
    //console.log(">>>>> in the QueryMediaInfo, paramData.MediaFilterMediaType = "+paramData.MediaFilterMediaType)
    //console.log("--------------------------------------------------------------------")
    //console.log("$$$$$ in the QueryMediaInfo, mediaType = "+mediaType)

    // This is set when tab, tile, or album is clicked, but making sure it get set in the parameter values (for the API calls)
    if (paramData.MediaFilterMediaType != null && paramData.MediaFilterMediaType != '') {
        setMediaType(parseInt(paramData.MediaFilterMediaType))
    } else {
        paramData.MediaFilterMediaType = mediaType.toString()
    }   

    // Load the category list for the selected media type
    let mti = mediaType - 1;
    // Set these for the createMediaPage function
    // >>>>>>> sometimes this is NOT set yet 
    defaultCategory = mediaTypeData[mti].Category[0].CategoryName
    if (paramData.MediaFilterCategory == null || paramData.MediaFilterCategory == '' || paramData.MediaFilterCategory == '0' || paramData.MediaFilterCategory == 'DEFAULT') {
        paramData.MediaFilterCategory = defaultCategory
    }

    // Save the parameters from the laste query
    queryCategory = paramData.MediaFilterCategory
    // Reset menuOrAlbumName (it will be set below if menu or album is specified)
    mediaInfo.menuOrAlbumName = ""

    // need the DEFAULT values to be set for the "first" query
    if (paramData.MediaFilterStartDate != null && paramData.MediaFilterStartDate != '') {
        if (paramData.MediaFilterStartDate == "DEFAULT") {
            paramData.MediaFilterStartDate = "1800-01-01"
            if (mediaType == 1) {
                paramData.MediaFilterStartDate = addDays(new Date(), -60)
            }
        }
    }

    if (paramData.MediaFilterMenuItem != null && paramData.MediaFilterMenuItem != '') {
        mediaInfo.menuOrAlbumName = paramData.MediaFilterMenuItem
	}
    if (paramData.MediaFilterAlbumKey != null && paramData.MediaFilterAlbumKey != '') {
        if (paramData.MediaFilterAlbumName != null && paramData.MediaFilterAlbumName != '') {
            mediaInfo.menuOrAlbumName = paramData.MediaFilterAlbumName
        }
	}

    showLoadingSpinner(MediaPageMessage)
    try {
        const response = await fetch("/api/GetMediaInfo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // >>>>>>>>>>>>>>>>>  Should there be some kind of retry for certain failures?
        // Success
        let mediaInfoList = await response.json()
        //console.log("mediaInfoList.length = ",mediaInfoList.length)

        mediaInfo.fileList.length = 0
        mediaInfo.fileList = mediaInfoList
        mediaInfo.filterList = []

        if (mediaInfo.fileList.length > 0) {
            mediaInfo.startDate = mediaInfo.fileList[0].takenDateTime.substring(0,10)
            //console.log(">>> mediaInfo.startDate = "+mediaInfo.startDate)

            // Set the filter list elements
            let currYear = mediaInfo.startDate.substring(0,4)
            let lastTakenDateTime = mediaInfo.fileList[mediaInfo.fileList.length-1].takenDateTime
            let filterRec = {
                filterName: "StartDate",
                startDate: mediaInfo.startDate
            }
            mediaInfo.filterList.push(filterRec)

            let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1
            filterRec = {
                filterName: "Prev Year",
                startDate: prevYear.toString()+"-01-01"
            }
            mediaInfo.filterList.push(filterRec)
        
            filterRec = {
                filterName: "Next",
                startDate: lastTakenDateTime
            }
            mediaInfo.filterList.push(filterRec)
            //console.log("Next, startDate: lastTakenDateTime = "+lastTakenDateTime)

            //if ($param->MediaFilterMediaType == 1 && !$albumKeyExists && $cnt > 50) {
            if (mediaType == 1 && paramData.MediaFilterAlbumKey == "" && mediaInfo.fileList.length > 50) {
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-01-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Spring",
                    startDate: currYear+"-04-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Summer",
                    startDate: currYear+"-07-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Fall",
                    startDate: currYear+"-10-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-12-01"
                }
                mediaInfo.filterList.push(filterRec)
            }

        } // if (mediaInfo.fileList.length > 0) {

        if (paramData.getMenu) {
            let mti = mediaType - 1
            mediaTypeDesc = mediaTypeData[mti].MediaTypeDesc
            contentDesc = mediaTypeDesc

            // Clear array before setting with values
            mediaInfo.menuList.length = 0
            categoryList.length = 0

            let cnt = 0;
            if (mediaTypeData[mti].Category != null) {
                let category = null
                for (let i = 0; i < mediaTypeData[mti].Category.length; i++) {
                    category = mediaTypeData[mti].Category[i]
                    categoryList.push(category.CategoryName)
                    cnt++
                    /*
                    if (mediaType == 1) {
                        if (cnt == 2) {
                            defaultCategory = category.CategoryName
                            // Set the menuFilter array strings with the menu items for the default category
                            for (let j = 0; j < category.Menu.length; j++) {
                                //menuFilter[menuFilter.length] = category.CategoryName + " - " + category.Menu[j].MenuItem;
                                menuFilter[menuFilter.length] = category.Menu[j].MenuItem;
                            }
                        }
                    } else {
                        if (cnt == 1) {
                            defaultCategory = category.CategoryName
                            // Set the menuFilter array strings with the menu items for the default category
                            for (let j = 0; j < category.Menu.length; j++) {
                                //menuFilter[menuFilter.length] = category.CategoryName + " - " + category.Menu[j].MenuItem;
                                menuFilter[menuFilter.length] = category.Menu[j].MenuItem;
                            }
                        }
                    }
                    */
                    for (let j = 0; j < category.Menu.length; j++) {
                        menuFilter[menuFilter.length] = category.Menu[j].MenuItem;
                    }
    
                    let menuObject = 
                    {
                        category: category.CategoryName,
                        subMenuList: category.Menu
                    }
    
                    mediaInfo.menuList.push(menuObject)
                }
            }

            // Save the menu lists
            setMenuList(mediaInfo.menuList)
        }

        // Save the parameters from the laste query
        queryCategory = paramData.MediaFilterCategory
        querySearchStr = ""
        if (paramData.MediaFilterSearchStr != null && paramData.MediaFilterSearchStr != "") {
            querySearchStr = paramData.MediaFilterSearchStr
        }
        queryMenuItem = ""
        if (paramData.MediaFilterMenuItem != null & paramData.MediaFilterMenuItem != "") {
            queryMenuItem = paramData.MediaFilterMenuItem
        }
        queryAlbumKey = ""
        if (paramData.MediaFilterAlbumKey != null & paramData.MediaFilterAlbumKey != "") {
            queryAlbumKey = paramData.MediaFilterAlbumKey
            // Get the Album Name if not included
            if (mediaInfo.menuOrAlbumName == "") {
                mediaInfo.menuOrAlbumName = getAlbumName(queryAlbumKey)
            }
        }

        contentDesc = mediaTypeDesc + " - " + queryCategory
        createMediaPage(paramData.getMenu)
        MediaPageMessage.textContent = ""

        if (paramData.getMenu) {
            queryMediaAlbum(paramData)
        }

    } catch (err) {
        console.error(err)
        MediaPageMessage.textContent = "Error getting media information: " + err.message
    }
    
} // queryMediaInfo

//------------------------------------------------------------------------------------------------------------
// Query the database for media album list
//------------------------------------------------------------------------------------------------------------
export async function queryMediaAlbum(paramData) {
    try {
        const response = await fetch("/api/GetMediaAlbum", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // Success
        let mediaAlbumList = await response.json()
        //console.log("mediaAlbumList.length = ",mediaAlbumList.length)
        setAlbumList(mediaAlbumList)
        buildAlbumMenuElements(mediaType)

    } catch (err) {
        console.error(err)
        MediaPageMessage.textContent = "Error getting media album information: " + err.message
    }
    
} // queryMediaInfo


//------------------------------------------------------------------------------------------------------------
// Update the media info in the database table (Batch)
//------------------------------------------------------------------------------------------------------------
export async function updateMediaInfo(inIndex) {
    let index = -1
    if (inIndex != null && inIndex >= 0) {
        index = inIndex
    }

    // Assume current values and selected files in the mediaInfo.fileList are what we want updated
    // unless the index is set, which indicates an individual update
    let paramData = {
        MediaFilterMediaType: mediaType,
        MediaInfoFileList: mediaInfo.fileList,
        FileListIndex: index
    }

    const endpoint = "/api/UpdateMediaInfo";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramData)
    })
    const returnMsg = await response.text()
    //console.log("result = "+returnMsg)

    if (index >= 0) {
        updateMessage(returnMsg)
        // If individual index-based update, just de-Select but leave it in the file list
        mediaInfo.fileList[index].selected = false
    } else {
        // Filter out the Selected files (that were updated)
        updateAdminMessage(returnMsg)
        mediaInfo.fileList = mediaInfo.fileList.filter(checkSelected);
    }

    displayCurrFileList()
}

//------------------------------------------------------------------------------------------------------------
// Add new media info records in the database for new videos
//------------------------------------------------------------------------------------------------------------
export function newVideosMediaInfo() {
    let index = -1
    if (inIndex != null && inIndex >= 0) {
        index = inIndex
    }

    // Assume current values and selected files in the mediaInfo.fileList are what we want updated
    // unless the index is set, which indicates an individual update
    let paramData = {
        MediaFilterMediaType: mediaType,
        MediaInfoFileList: mediaInfo.fileList,
        index: index
    }

    /*
    let url = jjkgalleryRoot + "updateMediaInfo.php"
    fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(paramData)
    })
    .then(response => response.text())
    .then(returnMsg => {
        //console.log("returnMsg = "+returnMsg)

        updateAdminMessage(returnMsg)

        displayCurrFileList()
    }); // End of Fetch
    */
}

function checkSelected(fileInfo) {
    return !fileInfo.Selected
}

export function setMenuFilter(categoryName) {
    // Clear the array
    menuFilter = []
    menuFilter.length = 0
    let mti = mediaType - 1
    if (categoryName == "ALL") {
        for (let index in mediaTypeData[mti].Category) {
            for (let index2 in mediaTypeData[mti].Category[index].Menu) {
                menuFilter[menuFilter.length] = mediaTypeData[mti].Category[index].Menu[index2].MenuItem
            }
        }
    } else {
        for (let index in mediaTypeData[mti].Category) {
            if (mediaTypeData[mti].Category[index].CategoryName == categoryName) {
                for (let index2 in mediaTypeData[mti].Category[index].Menu) {
                    menuFilter[menuFilter.length] = mediaTypeData[mti].Category[index].Menu[index2].MenuItem
                }
            }
        }
    }
}


var mediaTypeData = [
{
    id: "1",
    MediaTypeId: 1,
    MediaTypeDesc: "Photos",
    Category: [
        {
            CategoryName: "1 John J Kauflin",
            Menu: [
                {
                    MenuItem: "1987-to-1993"
                },
                {
                    MenuItem: "1994-to-2001"
                },
                {
                    MenuItem: "2002-to-2008"
                },
                {
                    MenuItem: "2009-to-2015"
                },
                {
                    MenuItem: "2016-to-2022"
                },
                {
                    MenuItem: "2023-to-2029"
                },
                {
                    MenuItem: "GRHA"
                },
                {
                    MenuItem: "LexisNexis"
                },
                {
                    MenuItem: "Navistar"
                }
            ]
        },
        {
            CategoryName: "ALL",
            Menu: []
        },
        {
            CategoryName: "2 John E Kauflin",
            Menu: [
                {
                    MenuItem: "1940-to-1966"
                },
                {
                    MenuItem: "1966 Portrait album"
                },
                {
                    MenuItem: "1967-to-1972"
                },
                {
                    MenuItem: "1973-to-1976"
                },
                {
                    MenuItem: "1977-to-1979"
                },
                {
                    MenuItem: "1980-to-1982"
                },
                {
                    MenuItem: "1981-to-1984-remodeling"
                },
                {
                    MenuItem: "1983-to-1985"
                },
                {
                    MenuItem: "1986-to-1988"
                },
                {
                    MenuItem: "1989-to-1991"
                },
                {
                    MenuItem: "1992-to-1994"
                },
                {
                    MenuItem: "2000-to-2004"
                },
                {
                    MenuItem: "2005-to-2009"
                },
                {
                    MenuItem: "2010-to-2016"
                },
                {
                    MenuItem: "2017 KI Whistling Straights"
                },
                {
                    MenuItem: "2017-to-present"
                },
                {
                    MenuItem: "2024-to-present"
                }
            ]
        },
        {
            CategoryName: "3 Baker Family",
            Menu: [
                {
                    MenuItem: "1915-to-1959"
                },
                {
                    MenuItem: "1960-to-1999"
                },
                {
                    MenuItem: "2000-to-2006"
                },
                {
                    MenuItem: "2006-10-16 Martha funeral"
                },
                {
                    MenuItem: "2007-12-09 Sarah Pfouts wedding"
                },
                {
                    MenuItem: "2008-to-2014"
                },
                {
                    MenuItem: "2013-10-18 Baker reunion"
                },
                {
                    MenuItem: "2015-12-24 Bill Pfouts"
                },
                {
                    MenuItem: "2016-Present"
                }
            ]
        },
        {
            CategoryName: "4 Mann Family",
            Menu: [
                {
                    MenuItem: "1970-to-1999"
                },
                {
                    MenuItem: "2000-to-2003"
                },
                {
                    MenuItem: "2003-06-23-Stephen-wedding"
                },
                {
                    MenuItem: "2004-to-2006"
                },
                {
                    MenuItem: "2008-Stephen"
                },
                {
                    MenuItem: "2009-08-22-Reunion"
                },
                {
                    MenuItem: "2010-07-11-Ben-and-Jaquata"
                },
                {
                    MenuItem: "2011-05-02-Easter"
                },
                {
                    MenuItem: "2011-12-25-Christmas"
                },
                {
                    MenuItem: "2012-to-present"
                }
            ]
        },
        {
            CategoryName: "5 Bands",
            Menu: [
                {
                    MenuItem: "Band Parties"
                },
                {
                    MenuItem: "John J Kauflin"
                },
                {
                    MenuItem: "Phil N The Blanks"
                },
                {
                    MenuItem: "Something Else"
                },
                {
                    MenuItem: "The Crunge"
                },
                {
                    MenuItem: "The Midnight Ramblers"
                },
                {
                    MenuItem: "The Mortar Shells"
                },
                {
                    MenuItem: "Van Kauflin"
                }
            ]
        },
        {
            CategoryName: "Mementos",
            Menu: [
                {
                    MenuItem: "Albums"
                },
                {
                    MenuItem: "Equipment"
                },
                {
                    MenuItem: "JohnBot"
                },
                {
                    MenuItem: "Kids artwork"
                },
                {
                    MenuItem: "Micronauts"
                },
                {
                    MenuItem: "Misc"
                },
                {
                    MenuItem: "Wacky Packages"
                }
            ]
        },
        {
            CategoryName: "Misc",
            Menu: [
                {
                    MenuItem: "Art"
                },
                {
                    MenuItem: "Famous People"
                },
                {
                    MenuItem: "Funny"
                },
                {
                    MenuItem: "History"
                },
                {
                    MenuItem: "Music People"
                },
                {
                    MenuItem: "Nature"
                }
            ]
        }
    ]
},
{
    id: "2",
    MediaTypeId: 2,
    MediaTypeDesc: "Videos",
    Category: [
        {
            CategoryName: "1 John J Kauflin",
            Menu: [
                {
                    MenuItem: "1995-2004"
                },
                {
                    MenuItem: "2005-2009"
                },
                {
                    MenuItem: "2010-2015"
                },
                {
                    MenuItem: "2016-2019"
                },
                {
                    MenuItem: "2020-2025"
                }
            ]
        },
        {
            CategoryName: "2 John E Kauflin",
            Menu: [
                {
                    MenuItem: "1964-1967 Home Movies"
                },
                {
                    MenuItem: "1968-1972 Home Movies"
                },
                {
                    MenuItem: "1973-1983 Home Movies"
                },
                {
                    MenuItem: "2009"
                }
            ]
        },
        {
            CategoryName: "3 Baker family",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "4 Mann family",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "5 Van Kauflin",
            Menu: [
                {
                    MenuItem: "2012 Play With Me film"
                },
                {
                    MenuItem: "2018 Von Kauflin"
                },
                {
                    MenuItem: "2020-03 Practice"
                },
                {
                    MenuItem: "2021-11 Thanksgiving practice"
                },
                {
                    MenuItem: "2021-12 Winterfest"
                },
                {
                    MenuItem: "2023-05 Basement Party"
                }
            ]
        },
        {
            CategoryName: "6 The Crunge",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "7 Something Else",
            Menu: [
                {
                    MenuItem: "1992 Rich Lamb jam"
                },
                {
                    MenuItem: "1992 The Richey tape"
                },
                {
                    MenuItem: "1992-03 Practice"
                },
                {
                    MenuItem: "1994 Oregon Express"
                },
                {
                    MenuItem: "1997-02 Practice"
                },
                {
                    MenuItem: "1997-05 Practice"
                },
                {
                    MenuItem: "1998 Live with Sean B"
                },
                {
                    MenuItem: "2000 New Years jam"
                },
                {
                    MenuItem: "2001 Solstice jam"
                },
                {
                    MenuItem: "2003 2003-to-2006"
                },
                {
                    MenuItem: "2004-09 Practice"
                },
                {
                    MenuItem: "2004-2006"
                },
                {
                    MenuItem: "2007 Solstice party"
                },
                {
                    MenuItem: "2008-09 Rockfest 6"
                },
                {
                    MenuItem: "2012-09 Rockfest 10"
                }
            ]
        },
        {
            CategoryName: "8 Midnight Ramblers",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "9 Navistar",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "10 Nerdvana",
            Menu: [
                {
                    MenuItem: "2023-06 IT Summer Fest"
                },
                {
                    MenuItem: "2023-11 Practice for Xmas"
                },
                {
                    MenuItem: "2023-12 IT Xmas party at HQ"
                }
            ]
        }
    ]
},
{
    id: "3",
    MediaTypeId: 3,
    MediaTypeDesc: "Music",
    Category: [
        {
            CategoryName: "John Kauflin",
            Menu: [
                {
                    MenuItem: "(1985) Final Mixes 1"
                },
                {
                    MenuItem: "(1986) Final Mixes 2"
                },
                {
                    MenuItem: "(1987) Final Mixes 3"
                },
                {
                    MenuItem: "(1988) Final Mixes 4"
                },
                {
                    MenuItem: "(1988) Final Mixes 5"
                },
                {
                    MenuItem: "(1989) Final Mixes 6"
                },
                {
                    MenuItem: "(1990) Final Mixes 7"
                },
                {
                    MenuItem: "(1993) Final Mixes 11"
                },
                {
                    MenuItem: "(2003) Voices in my head"
                },
                {
                    MenuItem: "(2014-12) Winterfest acoustic set"
                },
                {
                    MenuItem: "(2019-08-31) John Kauflin at Rockfest"
                }
            ]
        },
        {
            CategoryName: "Van Kauflin",
            Menu: [
                {
                    MenuItem: "(2018-12) Von Kauflin at Winterfest"
                },
                {
                    MenuItem: "(2019-05-25) Van Kauflin Live"
                },
                {
                    MenuItem: "(2020-02-16) Demos"
                }
            ]
        },
        {
            CategoryName: "Something Else",
            Menu: [
                {
                    MenuItem: "(1991-05-25) SE practice"
                },
                {
                    MenuItem: "(1992) Something Else"
                },
                {
                    MenuItem: "(1997) I hate things that suck"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 1)"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 2)"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 3)"
                },
                {
                    MenuItem: "(2001-04-11) Last practice at 2621"
                },
                {
                    MenuItem: "(2005-09) Rockfest"
                },
                {
                    MenuItem: "(2006) Best of 1996 to 2006"
                },
                {
                    MenuItem: "(2012-09) Rockfest X"
                },
                {
                    MenuItem: "(2014-09) Rockfest"
                },
                {
                    MenuItem: "(2015-12) Winterfest"
                },
                {
                    MenuItem: "(2016-09) Rockfest"
                },
                {
                    MenuItem: "(2017-12) Winterfest"
                }
            ]
        },
        {
            CategoryName: "The Crunge",
            Menu: [
                {
                    MenuItem: "(1989) Basement Tape 89"
                },
                {
                    MenuItem: "(1990) Crunge demos"
                },
                {
                    MenuItem: "(1990) The Crunge (Live)"
                }
            ]
        },
        {
            CategoryName: "The Midnight Ramblers",
            Menu: [
                {
                    MenuItem: "(1985-08-13) The Seventh Sons"
                },
                {
                    MenuItem: "(1986-01-03) Live at Canal Street Tavern"
                },
                {
                    MenuItem: "(1986-06) Practice at Willowwood (w-Paul)"
                },
                {
                    MenuItem: "(1986-07) Practice for Dayton Band Playoffs"
                },
                {
                    MenuItem: "(1986-08-06) Day before McGuffys Pub"
                },
                {
                    MenuItem: "(1986-12) Jam to the world (session)"
                },
                {
                    MenuItem: "(1986-12-03) Practice at Willowwood"
                },
                {
                    MenuItem: "(1987-03) Practice (w-Carl)"
                },
                {
                    MenuItem: "(1987-06-22) Live at Plumberland"
                },
                {
                    MenuItem: "(1988) Off to Iowa session"
                },
                {
                    MenuItem: "(1988-03-26) Show for Jim"
                },
                {
                    MenuItem: "(1988-10-30) Halloween Demo Jam"
                },
                {
                    MenuItem: "(1988-11-12) Demo Night 2"
                },
                {
                    MenuItem: "(1988-11-14) Best of Demo Jams"
                },
                {
                    MenuItem: "(2017-12) Winterfest"
                }
            ]
        },
        {
            CategoryName: "Phil N the Blanks",
            Menu: [
                {
                    MenuItem: "(1984-06-01) Live in the basement"
                }
            ]
        },
        {
            CategoryName: "The Mortar Shells",
            Menu: [
                {
                    MenuItem: "(1980) Jamming in the basement"
                }
            ]
        },
        {
            CategoryName: "Richard Baker",
            Menu: [
                {
                    MenuItem: "(1983) Obscure Songs"
                }
            ]
        },
        {
            CategoryName: "Aftermath",
            Menu: [
                {
                    MenuItem: "(1989) Vocal Sessions"
                }
            ]
        },
        {
            CategoryName: "The Wise Fools",
            Menu: [
                {
                    MenuItem: "(1996) Demo Session"
                }
            ]
        },
        {
            CategoryName: "Blues Coalition",
            Menu: [
                {
                    MenuItem: "(1999) Complete Sessions"
                },
                {
                    MenuItem: "(1999) Complete Sessions 2"
                }
            ]
        }
    ]
},
{
    id: "4",
    MediaTypeId: 4,
    MediaTypeDesc: "Docs",
    Category: [
    {
        CategoryName: "John Kauflin",
        Menu: []
    }]
}
]
