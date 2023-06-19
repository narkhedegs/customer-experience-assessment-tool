import { Button, CircularProgress, Grid, Typography } from "@mui/material";

import { sendToContentScript } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";

import type { CollectDataRequest } from "~types/CollectDataRequest";
import type { CollectDataResponse } from "~types/CollectDataResponse";

function IndexPopup() {
  const [isDataCollectionInProgress] = useStorage<boolean>({
    key: "isDataCollectionInProgress",
    instance: new Storage({
      area: "local"
    })
  });

  const onStartDataCollectionButtonClick = async () => {
    await sendToContentScript<CollectDataRequest, CollectDataResponse>({
      name: "collect-data"
    });
  };

  return (
    <>
      <Grid container spacing={2} minWidth={500}>
        <Grid item xs={12}>
          <Typography variant="h6" align="center">
            Customer Experience Assessment Tool
          </Typography>
        </Grid>
        {isDataCollectionInProgress !== undefined && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              disabled={isDataCollectionInProgress ? true : false}
              onClick={onStartDataCollectionButtonClick}>
              {isDataCollectionInProgress ? (
                <>
                  <CircularProgress color="inherit" />
                  &nbsp;Data Collection In Progress
                </>
              ) : (
                <>Start Data Collection</>
              )}
            </Button>
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default IndexPopup;
