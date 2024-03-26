import jsonata from "jsonata";
import type { PlasmoCSConfig } from "plasmo";
import XLSX from "xlsx";

import { useMessage } from "@plasmohq/messaging/hook";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";

import { ApiError } from "~types/ApiError";
import type { CollectDataRequest } from "~types/CollectDataRequest";
import type { CollectDataResponse } from "~types/CollectDataResponse";

export const config: PlasmoCSConfig = {
  all_frames: true,
  matches: ["https://*.zendesk.com/*"]
};

const CollectData = () => {
  const [configurationString] = useStorage("ceatConfiguration");
  const configuration = configurationString
    ? JSON.parse(configurationString)
    : {};

  useMessage<CollectDataRequest, CollectDataResponse>(
    async (request, response) => {
      const storage = new Storage({
        area: "local"
      });
      await storage.set("isDataCollectionInProgress", true);

      const transformationContext = await buildTransformationContext(
        configuration
      );

      const workbook = XLSX.utils.book_new();

      for (const api of configuration.apis) {
        try {
          let records = await callPaginatedApi(
            api.url,
            api.collectionPropertyName
          );

          if (api.transformationExpression) {
            const transformerInput = {
              data: records,
              context: transformationContext
            };
            const expression = jsonata(api.transformationExpression);
            records = await expression.evaluate(transformerInput);
          }

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
            api?.sheetName ?? api.collectionPropertyName
          );
        } catch (error) {
          console.log("📋 ~ file: collect-data.tsx:212 ~ api:", api);

          if (error instanceof ApiError) {
            console.log(
              "📋 ~ file: collect-data.tsx:215 ~ error.httpResponse:",
              error.httpResponse
            );
            console.log(
              "📋 ~ file: collect-data.tsx:219 ~ error.response:",
              error.response
            );
          } else {
            console.log("📋 ~ file: collect-data.tsx:224 ~ error:", error);
          }
        }
      }

      const date = new Date();
      const workbookName = `export-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.xlsx`;

      try {
        XLSX.writeFile(workbook, workbookName);
      } catch (error) {
        console.log("📋 ~ file: collect-data.tsx:235 ~ error:", error);
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

async function buildTransformationContext(configuration) {
  const transformationContext = {};

  for (const transformationContextApi of configuration.transformationContextApis) {
    try {
      let transformationContextRecords = await callPaginatedApi(
        transformationContextApi.url,
        transformationContextApi.collectionPropertyName
      );

      transformationContext[
        transformationContextApi?.contextPropertyName ??
          transformationContextApi.collectionPropertyName
      ] = transformationContextRecords;
    } catch (error) {
      console.log(
        "📋 ~ buildTransformationContext ~ transformationContextApi:",
        transformationContextApi
      );

      if (error instanceof ApiError) {
        console.log(
          "📋 ~ buildTransformationContext ~ error.httpResponse:",
          error.httpResponse
        );
        console.log(
          "📋 ~ buildTransformationContext ~ error.response:",
          error.response
        );
      } else {
        console.log("📋 ~ buildTransformationContext ~ error:", error);
      }
    }
  }

  return transformationContext;
}

export default CollectData;
