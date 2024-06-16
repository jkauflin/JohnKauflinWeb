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
================================================================================*/

import {createMediaPage,displayCurrFileList,updateAdminMessage} from './mg-create-pages.js';
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
export var getMenu = false

export var queryCategory = ""
export var querySearchStr = ""
export var queryMenuItem = ""
export var queryAlbumKey = ""

export var categoryList = []
let defaultCategory = "1 John J Kauflin"

// Look into using environment variables for this (like secrets for Azure credentials)
let photosUri = "https://jjkwebstorage.blob.core.windows.net/photos/"
let thumbsUri = "https://jjkwebstorage.blob.core.windows.net/thumbs/"
let musicUri = "https://jjkwebstorage.blob.core.windows.net/music/"


export function setMediaType(inMediaType) {
    mediaType = parseInt(inMediaType)
}

export function getFilePath(index,descMod="",fullPath=false) {
    // descMod could be "Thumbs" or "Smaller"
    let fi = mediaInfo.fileList[index]

    if (mediaType == 3) {
        return musicUri + fi.Name
    } else {
        if (descMod == "Thumbs") {
            return thumbsUri + fi.Name
        } else {
            return photosUri + fi.Name
        }
    }
}

export function getFileName(index) {
    let fi = mediaInfo.fileList[index]
    let fileNameNoExt = fi.Name
    if (mediaType == 3 && fi.Title != '') {
        fileNameNoExt = fi.Title
    }
    let periodPos = fileNameNoExt.indexOf(".");
    if (periodPos >= 0) {
        fileNameNoExt = fileNameNoExt.substr(0,periodPos);
    }
    return fileNameNoExt
}

function addDays(inDate, days) {
    let td = new Date(inDate)
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
 
function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0'
    var pad = new Array(1 + padlen).join(pad_char)
    return (pad + num).slice(-pad.length)
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

    let formattedDate = "1888-01-01 00:00:00"
    if (inDateStr != null) {
        if (inDateStr.length >= 13) {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + inDateStr.substring(11,13)
        } else {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + "00"
        }
    }

    return(parseInt(formattedDate))
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryMediaInfo(paramData) {
    //console.log(">>>>> in the QueryMediaInfo, paramData.MediaFilterMediaType = "+paramData.MediaFilterMediaType)
    //console.log("--------------------------------------------------------------------")
    //console.log("$$$$$ in the QueryMediaInfo, mediaType = "+mediaType)

    getMenu = paramData.getMenu
    //getMenu = false

    // Set a default start date of 60 days back from current date
    mediaInfo.menuOrAlbumName = ""

    if (mediaType == 1) {
        mediaInfo.startDate = addDays(new Date(), -60)
    } else {
        mediaInfo.startDate = "1800-01-01"
    }

    let maxRows = 200
    if (mediaType == 2) {
		//maxRows = 18
		maxRows = 12
    }

    // When getMenu specified, query the MediaType container for menu values (first page load)
    let mediaTypeQuery = ""
    if (getMenu) {
        // loading...
        //setThumbnailMessage("Loading...")
        /*
            Category {
                CategoryName
                Menu {
                    MenuItem
                }
            }
        */
        mediaTypeQuery = `
        mtype_by_pk(id: ${mediaType.toString()}) {
            id
            MediaTypeDesc
            Category {
                CategoryName
            }
        }
        malbums 
        {
            items {
                AlbumKey
                AlbumName
            }
        }

        `
    }

/*
type Malbum @model {
  id: ID
  MediaAlbumId: Int
  AlbumKey: String
  AlbumName: String
  AlbumDesc: String
}
*/

    let categoryQuery = ""
    if (paramData.MediaFilterCategory != null && paramData.MediaFilterCategory != '' &&
        paramData.MediaFilterCategory != 'ALL' && paramData.MediaFilterCategory != '0') {
        if (paramData.MediaFilterCategory == 'DEFAULT') {
            categoryQuery = `{ CategoryTags: {contains: "${defaultCategory}"} }`
        } else {
            let tempCategory = paramData.MediaFilterCategory
            let pos = 0
            pos = paramData.MediaFilterCategory.indexOf(" Family")
            if (pos > -1) {
                tempCategory = paramData.MediaFilterCategory.substring(0,pos)
            }
            pos = paramData.MediaFilterCategory.indexOf(" family")
            if (pos > -1) {
                tempCategory = paramData.MediaFilterCategory.substring(0,pos)
            }

            categoryQuery = `{ CategoryTags: {contains: "${tempCategory}"} }`
        }
        //console.log(">>> categoryQuery = "+categoryQuery)
    }

    let startDateQuery = ""
    //console.log("paramData.MediaFilterStartDate = "+paramData.MediaFilterStartDate)
	if (paramData.MediaFilterStartDate != null && paramData.MediaFilterStartDate != '') {
		if (paramData.MediaFilterStartDate == "DEFAULT") {
			paramData.MediaFilterStartDate = mediaInfo.startDate
		}
        //console.log("      int MediaFilterStartDate = "+getDateInt(paramData.MediaFilterStartDate))
		//if (paramData.MediaFilterStartDate != "0001-01-01 00:00:00") {
        if (paramData.MediaFilterStartDate != "1888-01-01") {
            //startDateQuery = `{ TakenFileTime: { gte: 2023010108 } }`
            startDateQuery = `{ TakenFileTime: { gte: ${getDateInt(paramData.MediaFilterStartDate)} } }`
        }
        //console.log(">>> startDateQuery = "+startDateQuery)
	}

    let menuQuery = ""
    if (paramData.MediaFilterMenuItem != null && paramData.MediaFilterMenuItem != '') {
        // Maybe add Category to this (if needed)
        mediaInfo.menuOrAlbumName = paramData.MediaFilterMenuItem
        menuQuery = `{ MenuTags: {contains: "${paramData.MediaFilterMenuItem}"} }`
        //console.log(">>> menuQuery = "+menuQuery)
	}
    
    let albumQuery = ""
    if (paramData.MediaFilterAlbumKey != null && paramData.MediaFilterAlbumKey != '') {
        if (paramData.MediaFilterAlbumName != null && paramData.MediaFilterAlbumName != '') {
            mediaInfo.menuOrAlbumName = paramData.MediaFilterAlbumName
        }
        albumQuery = `{ AlbumTags: {contains: "${paramData.MediaFilterAlbumKey}"} }`
        //console.log(">>> albumQuery = "+albumQuery)
	}

    let searchQuery = ""
    if (paramData.MediaFilterSearchStr != null && paramData.MediaFilterSearchStr != '') {
        searchQuery = `{ SearchStr: {contains: "${paramData.MediaFilterSearchStr.toLowerCase()}"} }`
        // If search is specified, clear out the category and start date queries
        categoryQuery = ""
        startDateQuery = ""
        //console.log(">>> searchQuery = "+searchQuery)
	}

    let orderBy = "orderBy: { TakenDateTime: ASC }"
    /*
    if (mediaType == 2) {
        orderBy = "orderBy: { Name: ASC }"
    }
    */

/*
  id: ID
  MediaTypeId: Int
  Name: String
  TakenDateTime: String
  TakenFileTime: Float
  CategoryTags: String
  MenuTags: String
  AlbumTags: String
  Title: String
  Description: String
  People: String
  ToBeProcessed: Boolean
  SearchStr: String
*/
    let gql = `query {
            books(
                filter: { 
                    and: [ 
                        { MediaTypeId: { eq: ${mediaType} } }
                        ${categoryQuery}
                        ${menuQuery}
                        ${albumQuery}
                        ${searchQuery}
                        ${startDateQuery}
                    ] 
                },
                ${orderBy},
                first: ${maxRows}
            ) {
                items {
                    Name
                    TakenDateTime
                    Title
                }
            }
            ${mediaTypeQuery}
        }`

    console.log("gql = "+gql)

    const apiQuery = {
        query: gql,
        variables: {
        }
    }

    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery)
    });
    const result = await response.json();
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data = "+result.data)
        //console.table(result.data.mtypes.items);
        /*
        console.log("items[0].Category[1].CategoryName = "+result.data.mtypes.items[0].Category[1].CategoryName);
        console.log("items[0].Category[1].Menu = "+result.data.mtypes.items[0].Category[1].Menu);
        console.log("items[0].Category[1].Menu[0].MenuItem = "+result.data.mtypes.items[0].Category[1].Menu[0].MenuItem);
        */
        //console.table(result.data.books.items);
        //console.table(result.data.book_by_pk);
        //console.log("Title = "+result.data.book_by_pk.Title)
        //console.table(result.data.mtype_by_pk);
        console.log("data.mtype_by_pk.MediaTypeDesc = "+result.data.mtype_by_pk.MediaTypeDesc);
        console.log("data.mtype_by_pk.Category[0].CategoryName = "+result.data.mtype_by_pk.Category[0].CategoryName);
        /*
        if (result.data.mtype_by_pk.Category[0].Menu != null) {
            console.log("data.mtype_by_pk.Category[0].Menu[0].MenuItem = "+result.data.mtype_by_pk.Category[0].Menu[0].MenuItem);
        }
        */
        mediaInfo.fileList.length = 0
        mediaInfo.fileList = result.data.books.items
        mediaInfo.filterList = []

        if (mediaInfo.fileList.length > 0) {
            mediaInfo.startDate = mediaInfo.fileList[0].TakenDateTime.substring(0,10)

            // Set the filter list elements
            let currYear = mediaInfo.startDate.substring(0,4)
            let lastTakenDateTime = mediaInfo.fileList[result.data.books.items.length-1].TakenDateTime

            let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1
            let filterRec = {
                filterName: "Prev Year",
                startDate: prevYear.toString()+"-01-01"
            }
            mediaInfo.filterList.push(filterRec)
        
            filterRec = {
                filterName: "Next",
                startDate: lastTakenDateTime
            }
            mediaInfo.filterList.push(filterRec)

            //if ($param->MediaFilterMediaType == 1 && !$albumKeyExists && $cnt > 50) {
            if (mediaType == 1 && albumQuery == "" && mediaInfo.fileList.length > 50) {
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

        /*
        if (mediaInfo.currMenu != null && mediaInfo.currMenu != "") {
            contentDesc = mediaTypeDesc + " - " + mediaInfo.currMenu
        } else if (mediaInfo.currAlbum != null && mediaInfo.currAlbum != "") {
            contentDesc = mediaTypeDesc + " - " + mediaInfo.currAlbum
        }
        */

        if (getMenu) {
            mediaTypeDesc = result.data.mtype_by_pk.MediaTypeDesc
            contentDesc = mediaTypeDesc

                // Clear array before setting with values
            mediaInfo.menuList.length = 0
            categoryList.length = 0

            let cnt = 0;
            if (result.data.mtype_by_pk.Category != null) {
                result.data.mtype_by_pk.Category.forEach((category) => {
                    categoryList.push(category.CategoryName)
    
                    if (mediaType == 1) {
                        if (cnt == 2) {
                            defaultCategory = category.CategoryName
                        }
                    } else {
                        if (cnt == 1) {
                            defaultCategory = category.CategoryName
                        }
                    }
    
                    /*
                    if (category.Menu != null) {
                        category.Menu.forEach((menu) => {
                            menu.MenuItem
                        });
                    }
    
            $sql = "SELECT PeopleName FROM People ";
            $sql = $sql . "ORDER BY PeopleName; ";
            $stmt = $conn->prepare($sql)  or die($mysqli->error);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                while($row = $result->fetch_assoc()) {
                    array_push($mediaInfo->peopleList,$row["PeopleName"]);
                }
            }
                    */
    
                    let menuObject = 
                    {
                        category: category.CategoryName,
                        subMenuList: category.Menu
                    }
    
                    mediaInfo.menuList.push(menuObject)
                })
    
            }

            // Save the menu lists
            setMenuList(mediaInfo.menuList)
            setAlbumList(result.data.malbums.items)
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

        //MediaFilterAlbumKey
        //queryAlbumKey

        createMediaPage()
    }
}
