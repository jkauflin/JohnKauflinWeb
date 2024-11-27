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
            //apiCosmosDbConnStr = config["API_COSMOS_DB_CONN_STR"];
            apiCosmosDbConnStr = config["JJKDBNEW1_CONN_STR"];

            authCheck = new AuthorizationCheck(log);
            userAdminRole = "jjkadmin";   // add to config ???
        }

        [Function("UpdateMediaInfo")]
        public async Task<IActionResult> UpdateMediaInfo(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Parse the JSON payload content from the Request BODY into a C# object, and process the MediaInfo array to
            // find records to update
            //------------------------------------------------------------------------------------------------------------------
            string responseMessage = "";

            try {

                /*
                // Get the content string from the HTTP request body
                string content = await new StreamReader(req.Body).ReadToEndAsync();
                // Deserialize the JSON string into a generic JSON object
                JObject jObject = JObject.Parse(content);

                if (jObject.TryGetValue("searchStr", out JToken jToken)) {
                    string searchStr = (string)jToken;
                    searchStr = searchStr.Trim().ToUpper();
                    
                    sql = $"SELECT * FROM c WHERE "
                            +$"CONTAINS(UPPER(c.Parcel_ID),'{searchStr}') "
                            +$"OR CONTAINS(UPPER(c.LotNo),'{searchStr}') "
                            +$"OR CONTAINS(UPPER(c.Parcel_Location),'{searchStr}') "
                            +$"OR CONTAINS(UPPER(CONCAT(c.Owner_Name1,' ',c.Owner_Name2,' ',c.Mailing_Name)),'{searchStr}') "
                            +$"ORDER BY c.id";
                }
                */

                var content = await new StreamReader(req.Body).ReadToEndAsync();
                var updParamData = JsonConvert.DeserializeObject<UpdateParamData>(content);
                string databaseId = "JJKWebDB";
                string containerId = "MediaInfo";
                CosmosClient cosmosClient = new CosmosClient(apiCosmosDbConnStr); 
                Database db = cosmosClient.GetDatabase(databaseId);
                Container container = db.GetContainer(containerId);
                int updCnt = 0;
                int tempIndex = -1;
                foreach (Item item in updParamData.MediaInfoFileList) 
                {
                    tempIndex++;
                    if (updParamData.FileListIndex >= 0) {
                        // Check for update of a particular specified file
                        if (tempIndex != updParamData.FileListIndex) {
                            continue;
                        }
                    } else {
                        // If not a particular file, check for "selected" files to update
                        if (!item.Selected) {
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
                            await container.UpsertItemAsync(mediaInfo,new PartitionKey(mediaInfo.MediaTypeId));
                            updCnt++;
                        }
                    }
                }

                responseMessage = $"Number of records saved = {updCnt}";
            }
            catch (Exception ex) {
                responseMessage = $"Exception in update, message = {ex.Message}";
            }

            return new OkObjectResult(responseMessage);
        }


        [Function("GetPeopleList")]
        public async Task<IActionResult> GetPeopleList(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req)
        {
            string userName = "";
            if (!authCheck.UserAuthorizedForRole(req,userAdminRole,out userName)) {
                return new BadRequestObjectResult("Unauthorized call - User does not have the correct Admin role");
            }

            //log.LogInformation($">>> User is authorized - userName: {userName}");

            //------------------------------------------------------------------------------------------------------------------
            // Query the NoSQL container to get values
            //------------------------------------------------------------------------------------------------------------------
            string databaseId = "JJKWebDB";
            string containerId = "MediaPeople";
            List<string> peopleList = new List<string>();

            try {
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
            catch (Exception ex) {
                return new BadRequestObjectResult($"Exception in DB query to {containerId}, message = {ex.Message}");
            }

            return new OkObjectResult(peopleList);
        }
    } // public class WebApi

} // namespace JohnKauflinWeb.Function


