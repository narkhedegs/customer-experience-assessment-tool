import type { PlasmoCSConfig } from "plasmo";
import XLSX from "xlsx";

import { useMessage } from "@plasmohq/messaging/hook";
import { Storage } from "@plasmohq/storage";

import { ApiError } from "~types/ApiError";
import type { CollectDataRequest } from "~types/CollectDataRequest";
import type { CollectDataResponse } from "~types/CollectDataResponse";

export const config: PlasmoCSConfig = {
  all_frames: true,
  matches: ["https://*.zendesk.com/*"]
};

const getApisToCall = [
  {
    url: "/api/v2/triggers/active?include=usage_30d&page[size]=100",
    collectionPropertyName: "triggers"
  },
  {
    url: "/api/v2/trigger_categories?page[size]=100",
    collectionPropertyName: "trigger_categories"
  },
  {
    url: "/api/v2/automations/active?include=usage_30d&page[size]=100",
    collectionPropertyName: "automations"
  },
  {
    url: "/api/v2/macros/active?include=usage_30d&page[size]=100",
    collectionPropertyName: "macros"
  },
  {
    url: "/api/v2/views?active=true&page[size]=100",
    collectionPropertyName: "views"
  },
  {
    url: "/api/v2/custom_statuses",
    collectionPropertyName: "custom_statuses"
  },
  {
    url: "/api/v2/target_failures",
    collectionPropertyName: "target_failures"
  },
  {
    url: "/api/v2/users?role[]=admin&role[]=agent&page[size]=100",
    collectionPropertyName: "users",
    sheetName: "agents"
  },
  {
    url: "/api/v2/groups?page[size]=100",
    collectionPropertyName: "groups"
  },
  {
    url: "/api/v2/group_memberships?page[size]=100",
    collectionPropertyName: "group_memberships"
  },
  {
    url: "/api/v2/guide/content_tags?page[size]=30",
    collectionPropertyName: "records",
    sheetName: "content_tags"
  },
  {
    url: "/api/v2/help_center/articles/labels?page[size]=100",
    collectionPropertyName: "labels"
  }
];

const CollectData = () => {
  useMessage<CollectDataRequest, CollectDataResponse>(
    async (request, response) => {
      const storage = new Storage({
        area: "local"
      });
      await storage.set("isDataCollectionInProgress", true);

      const workbook = XLSX.utils.book_new();

      for (const getApi of getApisToCall) {
        try {
          const records = await callPaginatedApi(
            getApi.url,
            getApi.collectionPropertyName
          );

          records.forEach((record) => {
            Object.keys(record).forEach((key) => {
              if (
                record.hasOwnProperty(key) &&
                record[key] &&
                typeof record[key] === "object"
              ) {
                record[key] = JSON.stringify(record[key]);
              }
            });
          });

          const worksheet = XLSX.utils.json_to_sheet(records);
          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            getApi?.sheetName ?? getApi.collectionPropertyName
          );
        } catch (error) {
          console.log("📋 ~ file: collect-data.tsx:105 ~ getApi:", getApi);
          if (error instanceof ApiError) {
            console.log(
              "📋 ~ file: collect-data.tsx:107 ~ httpResponse:",
              error.httpResponse
            );
            console.log(
              "📋 ~ file: collect-data.tsx:111 ~ httpResponse:",
              error.response
            );
          } else {
            console.log("📋 ~ file: collect-data.tsx:116 ~ error:", error);
          }
        }
      }

      const date = new Date();
      const workbookName = `export-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.xlsx`;

      try {
        XLSX.writeFile(workbook, workbookName);
      } catch (error) {
        console.log("📋 ~ file: collect-data.tsx:127 ~ error:", error);
      }

      await storage.set("isDataCollectionInProgress", false);
    }
  );

  return <></>;
};

async function callPaginatedApi(url: string, collectionPropertyName: string) {
  let records = [];

  do {
    const response = await callRateLimitedApi(url);

    records = [].concat(records, response[collectionPropertyName]);

    if (response?.meta?.has_more) {
      if (response?.links) {
        url = response?.links?.next;
      } else {
        const [baseOfRelativeUrl, parameterString] = url.split("?");
        const urlSearchParameters = parameterString
          ? new URLSearchParams(parameterString)
          : new URLSearchParams();
        urlSearchParameters.set("page[after]", response?.meta?.after_cursor);
        url = `${baseOfRelativeUrl}?${urlSearchParameters.toString()}`;
      }
    } else {
      url = null;
    }
  } while (url);

  return records;
}

async function callRateLimitedApi(url: string) {
  const httpResponse = await fetch(url);
  const response = await httpResponse.json();

  if (!httpResponse.ok) {
    if (httpResponse.status === 429) {
      const secondsToWait = Number(httpResponse.headers["retry-after"]);
      await new Promise((resolve) => setTimeout(resolve, secondsToWait * 1000));

      return callRateLimitedApi(url);
    } else {
      throw new ApiError({ url, httpResponse, response });
    }
  }

  return response;
}

export default CollectData;
