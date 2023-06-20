import type { PlasmoCSConfig } from "plasmo";
import XLSX from "xlsx";

import { useMessage } from "@plasmohq/messaging/hook";
import { Storage } from "@plasmohq/storage";

import type { CollectDataRequest } from "~types/CollectDataRequest";
import type { CollectDataResponse } from "~types/CollectDataResponse";

export const config: PlasmoCSConfig = {
  all_frames: true,
  matches: ["https://*.zendesk.com/*"]
};

const getApisToCall = [
  {
    url: "/api/v2/triggers?page[size]=100",
    collectionPropertyName: "triggers"
  },
  {
    url: "/api/v2/automations?page[size]=100",
    collectionPropertyName: "automations"
  },
  {
    url: "/api/v2/macros?page[size]=100",
    collectionPropertyName: "macros"
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
        let records = await callPaginatedApi(
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
          getApi.collectionPropertyName
        );
      }

      const date = new Date();
      const workbookName = `export-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.xlsx`;
      XLSX.writeFile(workbook, workbookName);

      await storage.set("isDataCollectionInProgress", false);
    }
  );

  return <></>;
};

async function callPaginatedApi(url: string, collectionPropertyName: string) {
  let records = [];

  do {
    const response = await fetch(url).then((httpResponse) =>
      httpResponse.json()
    );

    records = [].concat(records, response[collectionPropertyName]);

    if (response.meta.has_more) {
      url = response.links.next;
    } else {
      url = null;
    }
  } while (url);

  return records;
}

export default CollectData;
