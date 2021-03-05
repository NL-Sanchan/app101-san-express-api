import http from "http";
import express from "express";
import cors from 'cors';

import config from "./config.json";
import initializeResource from "./resource";
import api from "./api";

let app = express();
app.server = http.createServer(app);

// connect to db
initializeResource((db, s3) => {
  // api router
  app.use("/api", api({ config, db, s3 }));

  app.server.listen(process.env.PORT || config.port, () => {
    console.log(`Started on port ${app.server.address().port}`);
  });
});