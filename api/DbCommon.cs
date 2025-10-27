/*==============================================================================
(C) Copyright 2025 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common functions to handle interaction with the data source, and
              Blob storage. Centralize all data source libraries and 
              configuration to this utility class.
--------------------------------------------------------------------------------
Modification History
2025-10-24 JJK  Initial versions
                *** NEW philosophy - put the error handling (try/catch) in the
                main/calling function, and leave it out of the DB Common - DB
                Common will throw any error, and the caller can log and handle
================================================================================*/
using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

using JohnKauflinWeb.Function.Model;

namespace JohnKauflinWeb.Function
{
    public class DbCommon
    {
        private readonly ILogger log;
        private readonly IConfiguration config;
        private readonly string? apiCosmosDbConnStr;
        private readonly string? apiStorageConnStr;
        private readonly string databaseId;

        public DbCommon(ILogger logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];
            apiStorageConnStr = config["AzureWebJobsStorage"];
            databaseId = "jjkdb1";
        }
        
        public async Task<SolarMetrics> GetSolarMetricsDB(Dictionary<string, object> paramData)
        {
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer("MetricPoint");

            //log.LogWarning("-------------------------------------------------------------------------------------------------------------------------------------------");
            //log.LogWarning($">>> paramData: {Newtonsoft.Json.JsonConvert.SerializeObject(paramData)}");

            int pointDay = paramData.ContainsKey("pointDateStartBucket") ? Convert.ToInt32(paramData["pointDateStartBucket"]) : 1;
            int pointDayTime = paramData.ContainsKey("pointDayTime") ? Convert.ToInt32(paramData["pointDayTime"]) : 0;
            int pointMaxRows = paramData.ContainsKey("pointMaxRows") ? Convert.ToInt32(paramData["pointMaxRows"]) : 500;
            int dayTotalStartBucket = paramData.ContainsKey("dayTotalStartBucket") ? Convert.ToInt32(paramData["dayTotalStartBucket"]) : 1;
            int dayTotalMaxRows = paramData.ContainsKey("dayTotalMaxRows") ? Convert.ToInt32(paramData["dayTotalMaxRows"]) : 14;

            // Initialize return object and lists
            var solarMetrics = new SolarMetrics();
            solarMetrics.pointList = new List<MetricPoint>();
            solarMetrics.totalList = new List<MetricTotal>();
            solarMetrics.yearTotalList = new List<MetricYearTotal>();

            // Request options: MaxItemCount controls page size (not total rows)
            QueryRequestOptions queryRequestOptions = new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(pointDay),
                MaxItemCount = pointMaxRows // Page Count - each page will return up to MaxItemCount items
            };

            // Build SQL query
            string sql = "SELECT TOP @maxRows * FROM c WHERE c.PointDayTime >= @pointDayTime ORDER BY c.PointDayTime ASC";

            var queryDef = new QueryDefinition(sql)
                .WithParameter("@maxRows", pointMaxRows)
                .WithParameter("@pointDayTime", pointDayTime);

            var feed = container.GetItemQueryIterator<MetricPoint>(queryDef,requestOptions: queryRequestOptions);
            int pageCnt = 0;
            int rowCnt = 0;
            while (feed.HasMoreResults)
            {
                pageCnt++;
                //log.LogWarning($"------- Reading page {pageCnt} ...");
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    rowCnt++;
                    solarMetrics.pointList.Add(item);
                    //log.LogWarning($">>> {rowCnt} {item.PointDay}, PointDateTime: {item.PointDateTime}, pvWatts: {item.pvWatts}");
                }
            }

            //-------------------------------------------------------------------------------------------------------------------------------------
            // Get the Day Totals
            //-------------------------------------------------------------------------------------------------------------------------------------
            container = db.GetContainer("MetricTotal");

            queryRequestOptions = new QueryRequestOptions
            {
                //PartitionKey = new PartitionKey(pointDay),
                MaxItemCount = dayTotalMaxRows  // Page Count - each page will return up to MaxItemCount items
            };

            // Build SQL query
            sql = "SELECT TOP @maxRows * FROM c WHERE c.id = @totalsId AND c.TotalBucket >= @dayTotalStartBucket ORDER BY c.TotalBucket ASC";
            queryDef = new QueryDefinition(sql)
                .WithParameter("@maxRows", dayTotalMaxRows)
                .WithParameter("@totalsId", "DAY")
                .WithParameter("@dayTotalStartBucket", dayTotalStartBucket);

            //log.LogWarning($">>> queryDef.QueryText: {queryDef.QueryText}");
            //log.LogWarning($">>> dayTotalStartBucket: {dayTotalStartBucket}");

            var feed2 = container.GetItemQueryIterator<MetricTotal>(queryDef,requestOptions: queryRequestOptions);
            pageCnt = 0;
            rowCnt = 0;
            while (feed2.HasMoreResults)
            {
                pageCnt++;
                //log.LogWarning($"------- Reading page {pageCnt} ...");
                var response = await feed2.ReadNextAsync();
                foreach (var item in response)
                {
                    rowCnt++;
                    solarMetrics.totalList.Add(item);
                    //log.LogWarning($">>> {rowCnt} {item.TotalBucket}, TotalValue: {item.TotalValue}, AmpMaxValue: {item.AmpMaxValue}, WattMaxValue: {item.WattMaxValue}");
                }
            }

            //-------------------------------------------------------------------------------------------------------------------------------------
            // Get the Year Totals
            //-------------------------------------------------------------------------------------------------------------------------------------
            container = db.GetContainer("MetricYearTotal");

            queryRequestOptions = new QueryRequestOptions
            {
                //PartitionKey = new PartitionKey(pointDay),
                MaxItemCount = dayTotalMaxRows  // Page Count - each page will return up to MaxItemCount items
            };

            // Build SQL query
            sql = "SELECT * FROM c WHERE c.id = @totalsId ORDER BY c.TotalBucket ASC";
            queryDef = new QueryDefinition(sql)
                .WithParameter("@totalsId", "YEAR");

            var feed3 = container.GetItemQueryIterator<MetricYearTotal>(queryDef,requestOptions: queryRequestOptions);
            pageCnt = 0;
            rowCnt = 0;
            while (feed3.HasMoreResults)
            {
                pageCnt++;
                //log.LogWarning($"------- Reading page {pageCnt} ...");
                var response = await feed3.ReadNextAsync();
                foreach (var item in response)
                {
                    rowCnt++;
                    solarMetrics.yearTotalList.Add(item);
                    //log.LogWarning($">>> {rowCnt} {item.TotalBucket}, TotalValue: {item.TotalValue}");
                }
            }

            return solarMetrics;
        }


        /*
        // Common internal function to lookup configuration values
        private async Task<string> getConfigVal(Container container, string configName)
        {
            string configVal = "";
            string sql = $"SELECT * FROM c WHERE c.ConfigName = '{configName}' ";
            var feed = container.GetItemQueryIterator<hoa_config>(sql);
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    configVal = item.ConfigValue ?? "";
                }
            }
            return configVal;
        }

        public async Task<List<HoaProperty>> GetPropertyList(string searchStr)
        {
            // Construct the query from the parameters
            searchStr = searchStr.Trim().ToUpper();
            string sql = $"SELECT * FROM c WHERE "
                        + $"CONTAINS(UPPER(c.Parcel_ID),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(c.LotNo),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(c.Parcel_Location),'{searchStr}') "
                        + $"OR CONTAINS(UPPER(CONCAT(c.Owner_Name1,' ',c.Owner_Name2,' ',c.Mailing_Name)),'{searchStr}') "
                        + $"ORDER BY c.id";

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string containerId = "hoa_properties";
            List<HoaProperty> hoaPropertyList = new List<HoaProperty>();
            HoaProperty hoaProperty = new HoaProperty();

            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer(containerId);

            var feed = container.GetItemQueryIterator<hoa_properties>(sql);
            int cnt = 0;
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    cnt++;
                    hoaProperty = new HoaProperty();
                    hoaProperty.parcelId = item.Parcel_ID;
                    hoaProperty.lotNo = item.LotNo;
                    hoaProperty.subDivParcel = item.SubDivParcel;
                    hoaProperty.parcelLocation = item.Parcel_Location;
                    hoaProperty.ownerName = item.Owner_Name1 + " " + item.Owner_Name2;
                    hoaProperty.ownerPhone = item.Owner_Phone;
                    hoaPropertyList.Add(hoaProperty);
                }
            }

            return hoaPropertyList;
        }
        */
        

        // Query Cosmos DB for MediaInfo records based on paramData
        public async Task<MediaInfoAll> GetMediaInfoDB(Dictionary<string, object> paramData)
        {
            CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
            Database db = cosmosClient.GetDatabase(databaseId);
            Container container = db.GetContainer("MediaInfo");

            log.LogWarning("-------------------------------------------------------------------------------------------------------------------------------------------");
            log.LogWarning($">>> GetMediaInfoDB paramData: {Newtonsoft.Json.JsonConvert.SerializeObject(paramData)}");

            /*
            let paramData = {
                MediaFilterMediaType: mediaType, 
                getMenu: true,
                MediaFilterCategory: "DEFAULT",
                MediaFilterStartDate: "DEFAULT"}
            */

            //int mediaTypeId = paramData.ContainsKey("MediaTypeId") ? Convert.ToInt32(paramData["MediaTypeId"]) : 1;

            var mediaInfoAll = new MediaInfoAll();
            mediaInfoAll.fileList = new List<MediaInfo>();
            mediaInfoAll.albumList = new List<MediaAlbum>();


            DateTime defaultStartDate = DateTime.Today.AddDays(-60);
            // Set a default start date of 60 days back from current date
            /*
            if (mediaType == 1) {
                mediaInfo.startDate = addDays(new Date(), -60)
            } else {
                mediaInfo.startDate = "1800-01-01"
            }
            */

            // figure out how to get the MediaTypeId and set the getMenu flag
            bool getMenu = paramData.ContainsKey("getMenu") ? Convert.ToBoolean(paramData["getMenu"]) : false;

            int mediaTypeId = paramData.ContainsKey("MediaFilterMediaType") ? Convert.ToInt32(paramData["MediaFilterMediaType"]) : 1;
            string category = paramData.ContainsKey("MediaFilterCategory") ? (paramData["MediaFilterCategory"]?.ToString() ?? "") : "";
            
            string startDate = paramData.ContainsKey("MediaFilterStartDate") ? (paramData["MediaFilterStartDate"]?.ToString() ?? "") : "";

            int maxRows = 100;
            if (paramData.ContainsKey("maxRows"))
            {
                maxRows = Convert.ToInt32(paramData["maxRows"]);
            }
            else
            {
                if (mediaTypeId == 2) {
                    //maxRows = 18;
                    maxRows = 12;
                }
            }


            // When getMenu specified, query the MediaType container for menu values (first page load)
            //string mediaTypeQuery = "";
            if (getMenu)
            {
                Container albumContainer = db.GetContainer("MediaAlbum");
                var albumQuery = new QueryDefinition("SELECT * FROM c ORDER BY c.AlbumName");
                var albumFeed = albumContainer.GetItemQueryIterator<MediaAlbum>(albumQuery);
                while (albumFeed.HasMoreResults)
                {
                    var response = await albumFeed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        mediaInfoAll.albumList.Add(item);
                    }
                }
            }


/*
            mediaInfo.menuOrAlbumName = ""


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
        if (paramData.MediaFilterStartDate != "1800-01-01") {
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
*/

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
*/

            //log.LogWarning($">>> Filter params: MediaTypeId: {mediaTypeId}, Category: {category}, StartDate: {startDate}, maxRows: {maxRows}");
            // Request options: MaxItemCount controls page size (not total rows)
            QueryRequestOptions queryRequestOptions = new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(mediaTypeId),
                MaxItemCount = maxRows // Page Count - each page will return up to rowMax items
            };

            // Build SQL query
            string sql = "SELECT TOP @maxRows * FROM c WHERE c.MediaTypeId = @mediaTypeId";
            if (!string.IsNullOrEmpty(category) && category != "ALL" && category != "0")
            {
                sql += " AND CONTAINS(c.CategoryTags, @category)";
                log.LogWarning($">>> Adding category filter: {category}");
            }
            if (!string.IsNullOrEmpty(startDate))
            {
                // Expecting startDate as yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss
                if (DateTime.TryParse(startDate, out DateTime dt))
                {
                    long dtVal = long.Parse(dt.ToString("yyyyMMddHH"));
                    sql += " AND c.MediaDateTimeVal >= @startDateVal";
                    log.LogWarning($">>> Adding startDate filter: {startDate} ({dtVal})");
                }
            }
            sql += " ORDER BY c.MediaDateTimeVal DESC ";
            //log.LogWarning($"*** maxRows: {maxRows}, SQL: {sql}");

            var queryDef = new QueryDefinition(sql)
                .WithParameter("@maxRows", maxRows)
                .WithParameter("@mediaTypeId", mediaTypeId);

            if (!string.IsNullOrEmpty(category) && category != "ALL" && category != "0")
            {
                queryDef = queryDef.WithParameter("@category", category);
            }
            if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out DateTime dt2))
            {
                long dtVal = long.Parse(dt2.ToString("yyyyMMddHH"));
                queryDef = queryDef.WithParameter("@startDateVal", dtVal);
            }

            var mediaInfoList = new List<MediaInfo>();
            var feed = container.GetItemQueryIterator<MediaInfo>(queryDef, requestOptions: queryRequestOptions);

            int pageCnt = 0;
            int rowCnt = 0;
            while (feed.HasMoreResults)
            {
                pageCnt++;
                //log.LogWarning($"------- Reading page {pageCnt} ...");
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    rowCnt++;
                    mediaInfoList.Add(item);
                    //log.LogWarning($">>> {rowCnt} {item.Name}, MediaDateTime: {item.MediaDateTime}, CategoryTags: {item.CategoryTags}");    
                }
            }

            return mediaInfoAll;
        }


    } // public class DbCommon
} // namespace

