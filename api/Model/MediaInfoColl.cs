
using System;
using Newtonsoft.Json;

namespace JohnKauflinWeb.Function.Model
{
    public class MediaInfoColl
    {
        public List<MediaInfo> MediaInfoList { get; set; }                      // make it a GUID (not Name)
        public bool isAdmin { get; set; }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

}
