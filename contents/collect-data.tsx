import type { PlasmoCSConfig } from "plasmo";

import { useMessage } from "@plasmohq/messaging/hook";
import { Storage } from "@plasmohq/storage";

import type { CollectDataRequest } from "~types/CollectDataRequest";
import type { CollectDataResponse } from "~types/CollectDataResponse";

export const config: PlasmoCSConfig = {
  all_frames: true,
  matches: ["https://*.zendesk.com/*"]
};

const CollectData = () => {
  useMessage<CollectDataRequest, CollectDataResponse>(
    async (request, response) => {
      const storage = new Storage({
        area: "local"
      });
      await storage.set("isDataCollectionInProgress", true);

      const getApisToCall = [
        "/api/v2/triggers",
        "/api/v2/macros",
        "/api/v2/automations"
      ];

      const data = await Promise.all(
        getApisToCall.map((getApi) =>
          fetch(getApi).then((httpResponse) => httpResponse.json())
        )
      );
      console.log("📋 ~ file: collect-data.tsx:22 ~ data:", data);

      // const blobObject = new Blob(["Test"], {
      //   type: "application/octet-stream"
      // });
      // const blobUrl = URL.createObjectURL(blobObject);
      // const a = document.createElement("a");
      // a.download = "export.csv";
      // a.href = blobUrl;
      // a.click();
      // URL.revokeObjectURL(blobUrl);

      await storage.set("isDataCollectionInProgress", false);
    }
  );

  return <></>;
};

export default CollectData;
