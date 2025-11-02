/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Azure Function for SWA 
--------------------------------------------------------------------------------
Modification History
2024-06-30 JJK  Initial version (moving logic from PHP to here to update data
                in MediaInfo entities in Cosmos DB NoSQL
2024-07-28 JJK  Resolved JSON parse and DEBUG issues and got the update working
2024-08-10 JJK  Added function for getting People list
2024-11-13 JJK  Converted functions to run as dotnet-isolated in .net8.0, 
                logger (connected to App Insights), and added configuration 
                to get environment variables for the Cosmos DB connection str
                Modified to check user role from function context for auth
2025-05-23 JJK  Added functions for GenvMonitor
2025-07-05 JJK  Added UpdateGenvConfig (first time I used Co-Pilot AI agent 
                to help with editing code in VS Code)
================================================================================*/
using System.Globalization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;     // for IActionResult
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

using JohnKauflinWeb.Function.Model;

namespace JohnKauflinWeb.Function
{
    public class WebApi
    {
        private readonly ILogger<WebApi> log;
        private readonly IConfiguration config;
        private readonly string? apiCosmosDbConnStr;
        private readonly AuthorizationCheck authCheck;
        private readonly string userAdminRole;
        private readonly DbCommon dbCommon;

        public WebApi(ILogger<WebApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];

            authCheck = new AuthorizationCheck(log);
            userAdminRole = "jjkadmin";   // add to config ???

            dbCommon = new DbCommon(log, config);
        }


        // Public API for media info queries
        [Function("GetMediaInfo")]
        public async Task<IActionResult> GetMediaInfo(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                // paramData is a JSON object with filter params
                var paramData = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, object>>(body);
                var mediaInfoList = await dbCommon.GetMediaInfoDB(paramData);
                return new OkObjectResult(mediaInfoList);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in GetMediaInfo: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }
        }

        // Public API for media info queries
        [Function("GetMediaAlbum")]
        public async Task<IActionResult> GetMediaAlbum(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                // paramData is a JSON object with filter params
                var paramData = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, object>>(body);
                var mediaAlbumList = await dbCommon.GetMediaAlbumDB(paramData);
                return new OkObjectResult(mediaAlbumList);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in GetMediaInfo: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }
        }


        [Function("GetSolarMetrics")]
        public async Task<IActionResult> GetSolarMetrics(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var paramData = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, object>>(body);
                var solarMetrics = await dbCommon.GetSolarMetricsDB(paramData);
                return new OkObjectResult(solarMetrics);
            }
            catch (Exception ex)
            {
                log.LogError($"Exception in GetMediaInfo: {ex.Message} {ex.StackTrace}");
                return new BadRequestObjectResult($"Exception, message = {ex.Message}");
            }
        }


        [Function("UpdateMediaInfo")]
        public async Task<IActionResult> UpdateMediaInfo(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a C# object, and process the MediaInfo array to
            // find records to update
            //------------------------------------------------------------------------------------------------------------------
            string responseMessage = "";
            string databaseId = "jjkdb1";
            string containerId = "MediaInfo";

            try
            {
                var content = await new StreamReader(req.Body).ReadToEndAsync();
                var updParamData = JsonConvert.DeserializeObject<UpdateParamData>(content);
                if (updParamData == null)
                {
                    return new OkObjectResult("Parameter content was NULL");
                }

                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);
                int updCnt = 0;
                int tempIndex = -1;
                foreach (Item item in updParamData.MediaInfoFileList)
                {
                    tempIndex++;
                    if (updParamData.FileListIndex >= 0)
                    {
                        // Check for update of a particular specified file
                        if (tempIndex != updParamData.FileListIndex)
                        {
                            continue;
                        }
                    }
                    else
                    {
                        // If not a particular file, check for "selected" files to update
                        if (!item.selected)
                        {
                            continue;
                        }
                    }

                    // Build SQL query - Get the existing document from Cosmos DB (by the main unique "id")
                    var sql = "SELECT * FROM c WHERE c.id = @id ";
                    var queryDef = new QueryDefinition(sql)
                        .WithParameter("@id", item.id);
                    var feed = container.GetItemQueryIterator<MediaInfo>(queryDef);
                    while (feed.HasMoreResults)
                    {
                        var response = await feed.ReadNextAsync();
                        foreach (var mediaInfo in response)
                        {
                            mediaInfo.TakenDateTime = DateTime.Parse(item.takenDateTime);
                            mediaInfo.TakenFileTime = int.Parse(mediaInfo.TakenDateTime.ToString("yyyyMMddHH"));
                            mediaInfo.CategoryTags = item.categoryTags;
                            mediaInfo.MenuTags = item.menuTags;
                            mediaInfo.AlbumTags = item.albumTags;
                            mediaInfo.Title = item.title;
                            mediaInfo.Description = item.description;
                            mediaInfo.People = item.people;
                            mediaInfo.SearchStr = mediaInfo.CategoryTags.ToLower() + " " +
                                    mediaInfo.MenuTags.ToLower() + " " +
                                    mediaInfo.Title.ToLower() + " " +
                                    mediaInfo.Description.ToLower() + " " +
                                    mediaInfo.People.ToLower();
                            //await container.UpsertItemAsync(mediaInfo, new PartitionKey(mediaInfo.MediaTypeId));
                            updCnt++;
                        }
                    }
                }

                responseMessage = $"Number of records saved = {updCnt}";
            }
            catch (Exception ex)
            {
                responseMessage = $"Exception in update, message = {ex.Message}";
            }

            return new OkObjectResult(responseMessage);
        }


        [Function("GetPeopleList")]
        public async Task<IActionResult> GetPeopleList(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "jjkdb1";
            string containerId = "MediaPeople";
            List<string> peopleList = new List<string>();

            try
            {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                // Get the existing document from Cosmos DB
                var queryText = $"SELECT * FROM c ";
                var feed = container.GetItemQueryIterator<MediaPeople>(queryText);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var mediaPeople in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  Name: {mediaPeople.PeopleName}");
                        peopleList.Add(mediaPeople.PeopleName);
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(peopleList);
        }


        [Function("GetGenvConfig")]
        public async Task<IActionResult> GetGenvConfig(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "jjkdb1";
            string containerId = "GenvConfig";
            var genvConfigList = new List<GenvConfig>();

            try
            {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                // Get the content string from the HTTP request body
                string genvConfigId = await new StreamReader(req.Body).ReadToEndAsync();

                if (string.IsNullOrWhiteSpace(genvConfigId))
                {
                    // If no id is specified, get the last record only
                    var queryDefinition = new QueryDefinition("SELECT * FROM c ORDER BY c.ConfigId DESC OFFSET 0 LIMIT 1 ");
                    var feed = container.GetItemQueryIterator<GenvConfig>(queryDefinition);
                    while (feed.HasMoreResults)
                    {
                        var response = await feed.ReadNextAsync();
                        foreach (var item in response)
                        {
                            genvConfigList.Add(item);
                        }
                    }
                }
                else if (genvConfigId.Trim().Equals("History", StringComparison.OrdinalIgnoreCase))
                {
                    // If 'History' is specified, return all records ordered by ConfigId descending
                    var queryDefinition = new QueryDefinition("SELECT * FROM c ORDER BY c.ConfigId DESC");
                    var feed = container.GetItemQueryIterator<GenvConfig>(queryDefinition);
                    while (feed.HasMoreResults)
                    {
                        var response = await feed.ReadNextAsync();
                        foreach (var item in response)
                        {
                            genvConfigList.Add(item);
                        }
                    }
                }
                else
                {
                    // Get a single record by id
                    string id = genvConfigId.Trim();
                    int partitionKey = int.Parse(id);

                    ItemResponse<GenvConfig> response = await container.ReadItemAsync<GenvConfig>(
                        id: id,
                        partitionKey: new PartitionKey(partitionKey)
                    );

                    if (response.Resource != null)
                    {
                        genvConfigList.Add(response.Resource);
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(genvConfigList);
        }

        [Function("GetGenvMetricPoint")]
        public async Task<IActionResult> GetGenvMetricPoint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "jjkdb1";
            string containerId = "GenvMetricPoint";
            var genvMetricPoint = new GenvMetricPoint();

            try
            {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                var queryDefinition = new QueryDefinition(
                    "SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT 1 ");
                //"SELECT * FROM c WHERE c.id = @id")
                //.WithParameter("@id", "9");
                //.WithParameter("@id", "8");

                // Get the existing document from Cosmos DB
                var feed = container.GetItemQueryIterator<GenvMetricPoint>(queryDefinition);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        genvMetricPoint = item;
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(genvMetricPoint);
        }

        [Function("GetGenvSelfie")]
        public async Task<IActionResult> GetGenvSelfie(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "jjkdb1";
            string containerId = "GenvImage";
            string base64ImgData = "";

            try
            {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                var currDateTime = DateTime.Now;
                //    "SELECT * FROM c WHERE c.PointDay = @PointDay ORDER BY c.PointDayTime DESC")
                var queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.PointDay = @PointDay ORDER BY c._ts DESC OFFSET 0 LIMIT 1 ")
                    .WithParameter("@PointDay", int.Parse(currDateTime.ToString("yyyyMMdd")));
                // Get the existing document from Cosmos DB
                //var queryText = $"SELECT * FROM c ";
                var feed = container.GetItemQueryIterator<GenvImage>(queryDefinition);
                int cnt = 0;
                bool done = false;
                while (feed.HasMoreResults && !done)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  id: {genvConfig.id}");
                        /*
                            "id": "c55162e0-0717-485a-8598-cb69605000ea",
                            "PointDay": 20250517,
                            "PointDateTime": "2025-05-17 00:08:43",
                            "PointDayTime": 25000843,
                            "ImgData": 
                        */
                        // Get the string value of base64 image data from the most recent photo
                        base64ImgData = item.ImgData;
                        done = true;
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(base64ImgData);
        }

        private class RequestCommandParamData
        {
            public int ConfigId { get; set; } // Partition key (1)
            public string RequestCommand { get; set; }
            public string RequestValue { get; set; }
            public override string ToString()
            {
                return JsonConvert.SerializeObject(this);
            }
        }

        [Function("GenvRequestCommand")]
        public async Task<IActionResult> GenvRequestCommand(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a string
            //------------------------------------------------------------------------------------------------------------------
            string responseMessage = "";
            string databaseId = "jjkdb1";
            string containerId = "GenvCommandRequest";
            var genvCommandRequest = new GenvCommandRequest();

            try
            {
                var content = await new StreamReader(req.Body).ReadToEndAsync();
                var paramData = JsonConvert.DeserializeObject<RequestCommandParamData>(content);
                if (paramData == null)
                {
                    return new OkObjectResult("Parameter content was NULL");
                }

                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                genvCommandRequest.id = Guid.NewGuid().ToString(); // Generate a new unique id
                genvCommandRequest.ConfigId = paramData.ConfigId; // Partition key (1)
                genvCommandRequest.processed = false; // Initially not processed
                genvCommandRequest.requestCommand = paramData.RequestCommand;
                genvCommandRequest.requestValue = paramData.RequestValue;
                genvCommandRequest.requestResult = "Pending"; // Initial status

                genvCommandRequest.requestTime = DateTime.UtcNow; // Set the request time

                await container.CreateItemAsync(
                    genvCommandRequest,
                    new PartitionKey(genvCommandRequest.ConfigId)
                );

                responseMessage = $"Command requested = {paramData.RequestCommand}, Val = {paramData.RequestValue}";
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(responseMessage);
        } // GenvRequestCommand


        public void AddPatchField(List<PatchOperation> patchOperations, Dictionary<string, string> formFields, string fieldName, string fieldType = "Text", string operationType = "Replace")
        {
            if (patchOperations == null || formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return; // Prevent potential null reference errors

            if (operationType.Equals("Replace", StringComparison.OrdinalIgnoreCase))
            {
                if (fieldType.Equals("Text"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, value));
                    }
                }
                else if (fieldType.Equals("Int"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, int.Parse(value)));
                    }
                }
                else if (fieldType.Equals("Money"))
                {
                    string value = formFields[fieldName]?.Trim() ?? string.Empty;
                    //string input = "$1,234.56";
                    if (decimal.TryParse(value, NumberStyles.Currency, CultureInfo.GetCultureInfo("en-US"), out decimal moneyVal))
                    {
                        Console.WriteLine($"Parsed currency: {moneyVal}");
                        patchOperations.Add(PatchOperation.Replace("/" + fieldName, moneyVal));
                    }
                }
                else if (fieldType.Equals("Bool"))
                {
                    int value = 0;
                    if (formFields.ContainsKey(fieldName))
                    {
                        string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                        if (checkedValue.Equals("on"))
                        {
                            value = 1;
                        }
                    }
                    patchOperations.Add(PatchOperation.Replace("/" + fieldName, value));
                }
            }
            else if (operationType.Equals("Add", StringComparison.OrdinalIgnoreCase))
            {
                //string value = formFields[fieldName]?.Trim() ?? string.Empty;
                //patchOperations.Add(PatchOperation.Add("/" + fieldName, value));

                if (fieldType.Equals("Text"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Add("/" + fieldName, value));
                    }
                }
                else if (fieldType.Equals("Int"))
                {
                    if (formFields.ContainsKey(fieldName))
                    {
                        string value = formFields[fieldName]?.Trim() ?? string.Empty;
                        patchOperations.Add(PatchOperation.Add("/" + fieldName, int.Parse(value)));
                    }
                }
                else if (fieldType.Equals("Bool"))
                {
                    int value = 0;
                    if (formFields.ContainsKey(fieldName))
                    {
                        string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                        if (checkedValue.Equals("on"))
                        {
                            value = 1;
                        }
                    }
                    patchOperations.Add(PatchOperation.Add("/" + fieldName, value));
                }
            }
            else if (operationType.Equals("Remove", StringComparison.OrdinalIgnoreCase))
            {
                patchOperations.Add(PatchOperation.Remove("/" + fieldName));
            }
        }


        public T GetFieldValue<T>(Dictionary<string, string> formFields, string fieldName, T defaultValue = default)
        {
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return defaultValue;

            if (formFields.TryGetValue(fieldName, out string rawValue))
            {
                try
                {
                    if (typeof(T) == typeof(bool))
                    {
                        object boolValue = rawValue.Trim().Equals("on", StringComparison.OrdinalIgnoreCase);
                        return (T)boolValue;
                    }
                    else
                    {
                        return (T)Convert.ChangeType(rawValue.Trim(), typeof(T));
                    }
                }
                catch
                {
                    // Optionally log the error here
                    return defaultValue;
                }
            }

            return defaultValue;
        }

        public bool GetFieldValueBool(Dictionary<string, string> formFields, string fieldName)
        {
            bool value = false;
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return value; // Prevent potential null reference errors

            if (formFields.ContainsKey(fieldName))
            {
                string checkedValue = formFields[fieldName]?.Trim() ?? string.Empty;
                if (checkedValue.Equals("on"))
                {
                    value = true;
                }
            }
            return value;
        }
        public decimal GetFieldValueMoney(Dictionary<string, string> formFields, string fieldName)
        {
            decimal value = 0.00m;
            if (formFields == null || string.IsNullOrWhiteSpace(fieldName))
                return value; // Prevent potential null reference errors

            if (formFields.ContainsKey(fieldName))
            {
                string rawValue = formFields[fieldName]?.Trim() ?? string.Empty;
                //string input = "$1,234.56";
                if (decimal.TryParse(rawValue, NumberStyles.Currency, CultureInfo.GetCultureInfo("en-US"), out decimal moneyVal))
                {
                    //Console.WriteLine($"Parsed currency: {moneyVal}");
                }
                value = moneyVal;
            }
            return value;
        }


        [Function("UpdateGenvConfig")]
        public async Task<IActionResult> UpdateGenvConfig(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req, userAdminRole, out userName))
            {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a string
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "jjkdb1";
            string containerId = "GenvConfig";
            GenvConfig genvConfig = new GenvConfig();

            try
            {
                // Get content from the Request BODY
                var boundary = HeaderUtilities.RemoveQuotes(MediaTypeHeaderValue.Parse(req.Headers.GetValues("Content-Type").FirstOrDefault()).Boundary).Value;
                var reader = new MultipartReader(boundary, req.Body);
                var section = await reader.ReadNextSectionAsync();

                var formFields = new Dictionary<string, string>();
                var files = new List<(string fieldName, string fileName, byte[] content)>();

                while (section != null)
                {
                    var contentDisposition = section.GetContentDispositionHeader();
                    if (contentDisposition != null)
                    {
                        if (contentDisposition.IsFileDisposition())
                        {
                            using var memoryStream = new MemoryStream();
                            await section.Body.CopyToAsync(memoryStream);
                            files.Add((contentDisposition.Name.Value, contentDisposition.FileName.Value, memoryStream.ToArray()));
                        }
                        else if (contentDisposition.IsFormDisposition())
                        {
                            using var streamReader = new StreamReader(section.Body);
                            formFields[contentDisposition.Name.Value] = await streamReader.ReadToEndAsync();
                        }
                    }

                    section = await reader.ReadNextSectionAsync();
                }

                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                DateTime currDateTime = DateTime.Now;
                string LastChangedTs = currDateTime.ToString("o");

                //------------------------------------------------------------------------------------------------------------------
                // Query the NoSQL container to get current values
                //------------------------------------------------------------------------------------------------------------------
                string id = formFields["updId"].Trim();
                int configId = int.Parse(formFields["configId"].Trim());

                genvConfig = await container.ReadItemAsync<GenvConfig>(id, new PartitionKey(configId));

                // Overwrite values from formFields
                genvConfig.configDesc = GetFieldValue<string>(formFields, "configDesc");
                genvConfig.loggingOn = GetFieldValueBool(formFields, "loggingSwitch");
                genvConfig.selfieOn = GetFieldValueBool(formFields, "imagesSwitch");
                genvConfig.commandRequestOn = GetFieldValueBool(formFields, "commandRequestSwitch");
                genvConfig.daysToBloom = GetFieldValue<int>(formFields, "daysToBloom");
                // 2025-07-06 - this was done with Co-Pilot AI agent in VS Code - pretty cool!
                genvConfig.daysToGerm = GetFieldValue<string>(formFields, "daysToGerm");
                genvConfig.daysToBloom = GetFieldValue<int>(formFields, "daysToBloom");
                genvConfig.germinationStart = GetFieldValue<string>(formFields, "germinationStart");
                genvConfig.plantingDate = GetFieldValue<string>(formFields, "plantingDate");

                // Recalculate harvest, cure, and production dates (based on planting date and days to bloom)
                DateTime plantingDate = DateTime.Parse(GetFieldValue<string>(formFields, "plantingDate"));
                int daysToBloom = GetFieldValue<int>(formFields, "daysToBloom");
                genvConfig.harvestDate = plantingDate.AddDays(daysToBloom).ToString("yyyy-MM-dd");
                genvConfig.cureDate = plantingDate.AddDays(daysToBloom + 14).ToString("yyyy-MM-dd");
                genvConfig.productionDate = plantingDate.AddDays(daysToBloom + 21).ToString("yyyy-MM-dd");

                genvConfig.logMetricInterval = GetFieldValue<int>(formFields, "logMetricInterval");
                genvConfig.targetTemperature = GetFieldValue<float>(formFields, "targetTemperature");
                genvConfig.currTemperature = GetFieldValue<float>(formFields, "currTemperature");
                genvConfig.airInterval = GetFieldValue<float>(formFields, "airInterval");
                genvConfig.airDuration = GetFieldValue<float>(formFields, "airDuration");
                genvConfig.heatInterval = GetFieldValue<float>(formFields, "heatInterval");
                genvConfig.heatDuration = GetFieldValue<float>(formFields, "heatDuration");
                genvConfig.waterInterval = GetFieldValue<float>(formFields, "waterInterval");
                genvConfig.waterDuration = GetFieldValue<float>(formFields, "waterDuration");
                genvConfig.lightDuration = GetFieldValue<float>(formFields, "lightDuration");
                genvConfig.notes = GetFieldValue<string>(formFields, "notes");
                genvConfig.s0day = GetFieldValue<int>(formFields, "s0day");
                genvConfig.s0waterDuration = GetFieldValue<int>(formFields, "s0waterDuration");
                genvConfig.s0waterInterval = GetFieldValue<int>(formFields, "s0waterInterval");
                genvConfig.s1day = GetFieldValue<int>(formFields, "s1day");
                genvConfig.s1waterDuration = GetFieldValue<int>(formFields, "s1waterDuration");
                genvConfig.s1waterInterval = GetFieldValue<int>(formFields, "s1waterInterval");
                genvConfig.s2day = GetFieldValue<int>(formFields, "s2day");
                genvConfig.s2waterDuration = GetFieldValue<int>(formFields, "s2waterDuration");
                genvConfig.s2waterInterval = GetFieldValue<int>(formFields, "s2waterInterval");
                genvConfig.s3day = GetFieldValue<int>(formFields, "s3day");
                genvConfig.s3waterDuration = GetFieldValue<int>(formFields, "s3waterDuration");
                genvConfig.s3waterInterval = GetFieldValue<int>(formFields, "s3waterInterval");
                genvConfig.s4day = GetFieldValue<int>(formFields, "s4day");
                genvConfig.s4waterDuration = GetFieldValue<int>(formFields, "s4waterDuration");
                genvConfig.s4waterInterval = GetFieldValue<int>(formFields, "s4waterInterval");
                genvConfig.s5day = GetFieldValue<int>(formFields, "s5day");
                genvConfig.s5waterDuration = GetFieldValue<int>(formFields, "s5waterDuration");
                genvConfig.s5waterInterval = GetFieldValue<int>(formFields, "s5waterInterval");
                genvConfig.s6day = GetFieldValue<int>(formFields, "s6day");
                genvConfig.s6waterDuration = GetFieldValue<int>(formFields, "s6waterDuration");
                genvConfig.s6waterInterval = GetFieldValue<int>(formFields, "s6waterInterval");

                await container.ReplaceItemAsync(genvConfig, genvConfig.id, new PartitionKey(genvConfig.ConfigId));

            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(genvConfig);
        } // UpdateGenvConfig



    } // public class WebApi

} // namespace JohnKauflinWeb.Function


