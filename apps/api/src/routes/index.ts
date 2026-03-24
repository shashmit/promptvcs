import { Hono } from "hono";
import workspacesRoute from "./workspaces";
import projectsRoute from "./projects";
import promptsRoute from "./prompts";
import versionsRoute from "./versions";
import deploymentsRoute from "./deployments";
import apiKeysRoute from "./apikeys";
import sdkRoute from "./sdk";
import analyticsRoute from "./analytics";
import experimentsRoute from "./experiments";

export const routes = new Hono();

routes.route("/workspaces", workspacesRoute);
routes.route("/projects", projectsRoute);
routes.route("/prompts", promptsRoute);
routes.route("/versions", versionsRoute);
routes.route("/deployments", deploymentsRoute);
routes.route("/apikeys", apiKeysRoute);
routes.route("/sdk", sdkRoute); // public SDK endpoint
routes.route("/analytics", analyticsRoute);
routes.route("/experiments", experimentsRoute);
