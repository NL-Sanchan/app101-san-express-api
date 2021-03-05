import { Router } from "express";
import {
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
const multer = require('multer');
import * as fs from 'fs';
import * as fileType from 'file-type';

const upload = multer({ dest: '/tmp/uploads' });

export default ({ config, db, s3 }) => {

  let api = Router();
  let jsonParser = bodyParser.json();
  let tableName = "app-101-san-express-api"
  let bucketName = "san-iot-s3-dynamodb"

  // Create
  api.post("/", upload.single('thumbnail_image'), async (req, res) => {
    const { body, file } = req;

    let params = {
      TableName: tableName,
      Item: {
        'id': Date.now().toString(),
        'title': body.title,
        'completed': false
      }
    };
    if (file) {
      const id = uuidv4();
      const fileContent = fs.readFileSync(file.path);
  
      let fileExt, fileMime;
      await fileType.fromBuffer(fileContent)
          .then((data) => {
              fileExt = data.ext;
              fileMime = data.mime;
          });
  
      if (!fileExt) {
          res.status(400).json('error occurs');
          return;
      }
  
      const objectKey = `${id}.${fileExt}`;
  
      const s3params = {
          Bucket: bucketName,
          Key: objectKey,
          Body: fileContent,
          ContentType: fileMime
      };
      await s3.putObject(s3params).promise();

      params.Item.thumbnail_image_key = objectKey;
    }
    
    db.put(params, (err, data) => {
      if (err)
        res.status(500);
      else
        res.json(params.Item);
    });
  });

  // Read
  api.get("/", (req, res) => {
    const params = {
      TableName: tableName,
    };

    db.scan(params, (err, data) => {
      if (err)
        res.status(500);
      else
        res.json(data);
    });
  });

  api.get("/:id", (req, res) => {
    const { id } = req.params;

    const params = {
      TableName: tableName,
      KeyConditionExpression: "#id = :id",
      ExpressionAttributeNames:{
          "#id": "id"
      },
      ExpressionAttributeValues: {
          ":id": id
      }
    };

    db.query(params, (err, data) => {
      if (err)
        res.status(500);
      else
        res.json(data);
    });
  });

  // Update
  api.put("/:id", jsonParser, (req, res) => {
    const { id } = req.params;

    const params = {
      TableName: tableName,
      Key: {
        id
      },
      UpdateExpression: "set title=:title, completed=:completed",
      ExpressionAttributeValues:{
          ":title": req.body.title,
          ":completed": req.body.completed
      },
      ReturnValues:"UPDATED_NEW"
    };

    db.update(params, (err, data) => {
      if (err)
        res.status(500);
      else
        res.json(data);
    });
  });

  // Delete
  api.delete("/:id", (req, res) => {
    const { id } = req.params;

    const params = {
      TableName: tableName,
      Key: {
        id
      }
    };

    db.delete(params, (err, data) => {
      if (err)
        res.status(500);
      else
        res.json(data);
    });
  });

  return api;
};
