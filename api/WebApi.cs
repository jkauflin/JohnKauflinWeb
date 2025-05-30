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
================================================================================*/
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;     // for IActionResult
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;

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

        public WebApi(ILogger<WebApi> logger, IConfiguration configuration)
        {
            log = logger;
            config = configuration;
            apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];

            authCheck = new AuthorizationCheck(log);
            userAdminRole = "jjkadmin";   // add to config ???
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

            log.LogInformation($">>> User is authorized - userName: {userName}");

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
                        if (!item.Selected)
                        {
                            continue;
                        }
                    }

                    // Get the existing document from Cosmos DB (by the main unique "id")
                    var queryText = $"SELECT * FROM c WHERE c.id = \"{item.id}\" ";
                    var feed = container.GetItemQueryIterator<MediaInfo>(queryText);
                    while (feed.HasMoreResults)
                    {
                        var response = await feed.ReadNextAsync();
                        foreach (var mediaInfo in response)
                        {
                            //log.LogInformation($"Found item id: {mediaInfo.id}  Name: {mediaInfo.Name}");

                            mediaInfo.TakenDateTime = DateTime.Parse(item.TakenDateTime);
                            mediaInfo.TakenFileTime = int.Parse(mediaInfo.TakenDateTime.ToString("yyyyMMddHH"));
                            mediaInfo.CategoryTags = item.CategoryTags;
                            mediaInfo.MenuTags = item.MenuTags;
                            mediaInfo.AlbumTags = item.AlbumTags;
                            mediaInfo.Title = item.Title;
                            mediaInfo.Description = item.Description;
                            mediaInfo.People = item.People;
                            mediaInfo.SearchStr = mediaInfo.CategoryTags.ToLower() + " " +
                                    mediaInfo.MenuTags.ToLower() + " " +
                                    mediaInfo.Title.ToLower() + " " +
                                    mediaInfo.Description.ToLower() + " " +
                                    mediaInfo.People.ToLower();
                            await container.UpsertItemAsync(mediaInfo, new PartitionKey(mediaInfo.MediaTypeId));
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
            string containerId = "GenvConfig";
            var genvConfig = new GenvConfig();

            try
            {
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr);
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);

                var queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.id = @id")
                    .WithParameter("@id", "1");

                // Get the existing document from Cosmos DB
                //var queryText = $"SELECT * FROM c ";
                var feed = container.GetItemQueryIterator<GenvConfig>(queryDefinition);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var item in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  id: {genvConfig.id}");
                        genvConfig = item;
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(genvConfig);
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
                var queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.PointDay = @PointDay ORDER BY c.PointDayTime DESC")
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

            log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a string
            //------------------------------------------------------------------------------------------------------------------
            string responseMessage = "";
            string databaseId = "jjkdb1";
            string containerId = "GenvConfig";
            //var genvConfig = new GenvConfig();

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

                //PatchOperation.Increment("/inventory/quantity", 5),
                //PatchOperation.Add("/tags/-", "new-tag")
                PatchOperation[] patchOperations = new PatchOperation[]
                {
                    PatchOperation.Set("/requestCommand", paramData.RequestCommand),
                    PatchOperation.Set("/requestValue", paramData.RequestValue),
                };

                ItemResponse<dynamic> response = await container.PatchItemAsync<dynamic>(
                    "1",
                    new PartitionKey(1),
                    patchOperations
                );

                /*
                var queryDefinition = new QueryDefinition(
                    "SELECT * FROM c WHERE c.id = @id")
                    .WithParameter("@id", "1");

                // Get the existing document from Cosmos DB
                //var queryText = $"SELECT * FROM c ";
                var feed = container.GetItemQueryIterator<GenvConfig>(queryDefinition);
                int cnt = 0;
                while (feed.HasMoreResults)
                {
                    var response = await feed.ReadNextAsync();
                    foreach (var genvConfig in response)
                    {
                        cnt++;
                        //log.LogInformation($"{cnt}  id: {genvConfig.id}");

                        genvConfig.requestCommand = paramData.RequestCommand;
                        genvConfig.requestValue = paramData.RequestValue;
                        //await container.ReplaceItemAsync(genvConfig)
                        //await container.UpsertItemAsync(mediaInfo, new PartitionKey(mediaInfo.MediaTypeId));
                    }
                }
                if (cnt > 0)
                {

                    //configContainer.item(cr.id,cr.ConfigId).replace(cr); 


                }
                */

                responseMessage = $"RequestCommand updated";
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Exception in DB to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(responseMessage);
        } // GenvRequestCommand


    } // public class WebApi

} // namespace JohnKauflinWeb.Function


