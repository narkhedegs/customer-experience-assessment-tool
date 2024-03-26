import { Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { useStorage } from "@plasmohq/storage/hook";

const initialConfiguration = {
  transformationContextApis: [
    {
      url: "/api/v2/users?role[]=admin&role[]=agent&page[size]=100",
      collectionPropertyName: "users",
      contextPropertyName: "agents"
    },
    {
      url: "/api/v2/groups?page[size]=100",
      collectionPropertyName: "groups"
    }
  ],
  apis: [
    {
      url: "/api/v2/triggers/active?include=usage_30d&page[size]=100",
      collectionPropertyName: "triggers",
      transformationExpression: `$map($.data, function($v){($assigneeIds := $append($v.actions[field='assignee_id'].value,$append($v.conditions.all[field='assignee_id'].value,$v.conditions.any[field='assignee_id'].value));$groupIds := $append($v.actions[field='group_id'].value,$append($v.conditions.all[field='group_id'].value,$v.conditions.any[field='group_id'].value));$merge([$v,{"Assignee Remark": $count($filter($assigneeIds,function($assigneeId){$not($assigneeId in $map($$.context.agents.id,$string))})) > 0 ? "Invalid Assignee Id" : "","Group Remark": $count($filter($groupIds,function($groupId){$not($groupId in $map($$.context.groups.id,$string))})) > 0 ? "Invalid Group Id" : "","Update Type": "update_type" in $v.conditions.all.field or "update_type" in $v.conditions.any.field? "" : "Not using Update Type"}]);)})`
    },
    {
      url: "/api/v2/trigger_categories?page[size]=100",
      collectionPropertyName: "trigger_categories"
    },
    {
      url: "/api/v2/automations/active?include=usage_30d&page[size]=100",
      collectionPropertyName: "automations",
      transformationExpression: `$map($.data, function($v){($assigneeIds := $append($v.actions[field='assignee_id'].value,$append($v.conditions.all[field='assignee_id'].value,$v.conditions.any[field='assignee_id'].value));$groupIds := $append($v.actions[field='group_id'].value,$append($v.conditions.all[field='group_id'].value,$v.conditions.any[field='group_id'].value));$merge([$v,{"Assignee Remark": $count($filter($assigneeIds,function($assigneeId){$not($assigneeId in $map($$.context.agents.id,$string))})) > 0 ? "Invalid Assignee Id" : "","Group Remark": $count($filter($groupIds,function($groupId){$not($groupId in $map($$.context.groups.id,$string))})) > 0 ? "Invalid Group Id" : ""}]);)})`
    },
    {
      url: "/api/v2/macros/active?include=usage_30d&page[size]=100",
      collectionPropertyName: "macros",
      transformationExpression: `($macros:=$reduce($map($.data,function($v){$v.restriction.type='Group' and $count($v.restriction.ids) > 1?$map($v.restriction.ids,function($v1){$merge([$v,{"Restriction Group Name":$$.context.groups[id=$v1].name}])}):$v}),$append);$map($macros, function($v){$merge([$v,{"Comment Mode": ("comment_value" in $v.actions.field or "comment_value_html" in $v.actions.field) and $not("comment_mode_is_public" in $v.actions.field) ? "Comment without comment mode" : ""}])}))`
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
  ]
};

function OptionsIndex() {
  const [configuration, setConfiguration] = useStorage(
    "ceatConfiguration",
    (value) => (!value ? JSON.stringify(initialConfiguration, null, 2) : value)
  );

  const [temporaryConfiguration, setTemporaryConfiguration] =
    useState<string>();

  useEffect(() => {
    setTemporaryConfiguration(configuration);
  }, [configuration]);

  const onSave = () => {
    setConfiguration(temporaryConfiguration);
  };

  return (
    <Grid container spacing={2} minWidth={500}>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          Customer Experience Assessment Tool Options
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Configuration"
          multiline
          fullWidth
          maxRows={25}
          minRows={20}
          value={temporaryConfiguration}
          onChange={(event) => setTemporaryConfiguration(event.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} sx={{ float: "right" }}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            onClick={onSave}>
            Save
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default OptionsIndex;
