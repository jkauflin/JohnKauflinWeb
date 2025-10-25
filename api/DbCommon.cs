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
            databaseId = "hoadb";
            //acsEmailConnStr = config["ACS_EMAIL_CONN_STR"];
            //acsEmailSenderAddress = config["ACS_EMAIL_SENDER_ADDRESS"];
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
    public async Task<List<MediaInfo>> GetMediaInfoDB(Dictionary<string, object> paramData)
    {
        string databaseId = "hoadb";
        string containerId = "MediaInfoDoc";
        CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
        Database db = cosmosClient.GetDatabase(databaseId);
        Container container = db.GetContainer(containerId);

        //log.LogWarning("-------------------------------------------------------------------------------------------------------------------------------------------");
        //log.LogWarning($">>> GetMediaInfoDB paramData: {Newtonsoft.Json.JsonConvert.SerializeObject(paramData)}");

        //int mediaTypeId = paramData.ContainsKey("MediaTypeId") ? Convert.ToInt32(paramData["MediaTypeId"]) : 1;
        int mediaTypeId = paramData.ContainsKey("MediaFilterMediaType") ? Convert.ToInt32(paramData["MediaFilterMediaType"]) : 1;
        string category = paramData.ContainsKey("MediaFilterCategory") ? (paramData["MediaFilterCategory"]?.ToString() ?? "") : "";
        string startDate = paramData.ContainsKey("MediaFilterStartDate") ? (paramData["MediaFilterStartDate"]?.ToString() ?? "") : "";
        int maxRows = paramData.ContainsKey("maxRows") ? Convert.ToInt32(paramData["maxRows"]) : 300;

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
            var feed = container.GetItemQueryIterator<MediaInfo>(
                queryDef,
                requestOptions: queryRequestOptions);

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

        return mediaInfoList;
    }


} // public class HoaDbCommon
} // namespace GrhaWeb.Function

