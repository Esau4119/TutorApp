const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 8003;
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// import from controller here
const indexController = require("./APIs/IndexController");

const uploadFilePath = path.resolve(__dirname, "..", "Public/TutorFiles");

app.use(express.static("../Public"));
const options = {
  origin: "*",
};
app.use(cors(options));

// Define your API routes here
app.post("/getTutors", bodyParser.json(), async (req, res) => {
  const { subject, searchText } = req.body;
  const results = await indexController.getTutors(subject, searchText);
  res.send(results);
});
app.post("/createUser", bodyParser.json(), async (req, res) => {
  const { firstname, lastname, username, email, password } = req.body;
  const results = await indexController.createUser(
    firstname,
    lastname,
    username,
    email,
    password
  );
  res.send(results);
});
app.post("/getUser", bodyParser.json(), async (req, res) => {
  const { email, password } = req.body;
  const results = await indexController.getUser(email, password);
  res.send(results);
});

// Move the upload variable declaration to the top of the file
const uploadFile = multer({ dest: uploadFilePath });

app.post("/createTutor", uploadFile.fields([{name: 'attachments', maxCount:10}, {name: 'cv', maxCount: 1}, {name: 'photo', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, email, topicId, description, schedule } = req.body;

    // Access file information
    const attachments = req.files.attachments;
    const cv = req.files.cv;
    const photo = req.files.photo;

    // Validate email and file existence
    if (!email || !attachments || !cv) {
      return res.status(400).json({ error: "Email and file are required." });
    }

    const results = await indexController.createTutor(name, email, topicId, cv[0]['originalname'], description, photo[0]['originalname'], schedule);

    // save the photo and cv
    await fs.promises.rename(
      cv[0].path,
      uploadFilePath+`/${results.insertId}`+`;${cv[0].originalname}`
    );

    await fs.promises.rename(
      photo[0].path,
      uploadFilePath+`/${results.insertId}`+`;${photo[0].originalname}`
    );

    // Move the uploaded file to a desired location
    for (let i = 0; i < attachments.length; i++) {
      await fs.promises.rename(
        attachments[i].path,
        uploadFilePath+`/${results.insertId}`+`;${attachments[i].originalname}`
      );
    }


    // Respond with success message
    res.json({ message: "File uploaded successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/getTutor", bodyParser.json(), async (req, res) => {
  const { id } = req.body;
  const results = await indexController.getTutor(id);
  res.send(results);
});

app.post("/getTutorByEmail", bodyParser.json(), async (req, res) => {
  const { email } = req.body;
  const results = await indexController.getTutorByEmail(email);
  res.send(results);
});

app.post("/createMessage", bodyParser.json(), async (req, res) => {
  const { SenderId, RecevierId, Text } = req.body;
  const results = await indexController.createMessage(
    SenderId,
    RecevierId,
    Text
  );
  res.send(results);
});
app.post("/getMessage", bodyParser.json(), async (req, res) => {
  const { id } = req.body;
  const results = await indexController.getMessage(id);
  res.send(results);
});

app.post("/getMessageBySender", bodyParser.json(), async (req, res) => {
  const { id } = req.body;
  const results = await indexController.getMessageBySender(id);
  res.send(results);
});

app.post("/getTopic", bodyParser.json(), async (req, res) => {
  const results = await indexController.getTopic();
  res.send(results);
});
app.post("/createTopic", bodyParser.json(), async (req, res) => {
  const { Name, CategoryID, Description } = req.body;
  const results = await indexController.createTopic(
    Name,
    CategoryID,
    Description
  );
  res.send(results);
});
app.post("/createCategory", bodyParser.json(), async (req, res) => {
  const { Name, Description } = req.body;
  const results = await indexController.createCategory(Name, Description);
  res.send(results);
});
app.post("/getCategory", bodyParser.json(), async (req, res) => {
  const results = await indexController.getCategory();
  res.send(results);
});

AWS.config.update({
//  not today
});
const s3 = new AWS.S3();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  const params = {
    Bucket: "tutoringsite",
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };
  console.log(params);
  s3.upload(params, (err, data) => {
    if (!err) {
      res.json({ url: data.Location });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
