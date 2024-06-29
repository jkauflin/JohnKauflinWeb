using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Security.Claims;

namespace Johnkauflin.Function
{
    public static class HttpTrigger1
    {
        [FunctionName("HttpTrigger1")]
 //           [HttpTrigger(AuthorizationLevel.Admin, "get", "post", Route = null)] HttpRequest req,
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log,
             ClaimsPrincipal claimsPrincipal)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");
            bool userAdmin = claimsPrincipal.IsInRole("jjkadmin");
/*
   foreach (Claim claim in claimsPrincipal.Claims)
   {
      log.LogInformation("CLAIM TYPE: " + claim.Type + "; CLAIM VALUE: " + claim.Value + "</br>");
   }
  */

   // CLAIM TYPE: http://schemas.microsoft.com/2017/07/functions/claims/authlevel; CLAIM VALUE: Admin</br>    

            string name = req.Query["name"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            name = name ?? data?.name;

            string responseMessage = string.IsNullOrEmpty(name)
                ? $"*** JJK test userAdmin = {userAdmin} .This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
                : $"Hello, {name}. This HTTP triggered function executed successfully.";

            return new OkObjectResult(responseMessage);
        }
    }
}
