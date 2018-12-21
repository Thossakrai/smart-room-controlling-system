require("dotenv").config();

const functions = require("firebase-functions");
const mqtt = require("mqtt");
const url = require("url");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

const roomId = "-LRL6C7nA1kNGp29Synf";
const db = admin.database();

function publishToCloudMqtt(message) {
  const mqttURL = url.parse(process.env.CLOUDMQTT_URL);
  const topic = process.env.CLOUDMQTT_TOPIC;
  const client = mqtt.connect(mqttURL);
  client.on("connect", () => {
    client.publish(topic, message, () => {
      console.log(message);
      client.end();
    });
  });

  return Promise.resolve("done");
}

exports.mqttTrigger = functions.database
  .ref(`/rooms/${roomId}/{status}`)
  .onUpdate((change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    console.log(before);
    console.log(after);
    if (before === after) {
      console.log("There is not change.");
      return null;
    }
    const status = context.params.status;
    const result = JSON.parse(`{"${status}":${after}}`);
    db.ref("rooms")
      .child(roomId)
      .update(result)
      .then(() => Promise.resolve("done"))
      .catch(err => {
          console.error(err)
      });
    db.ref('rooms')
    .child(roomId).once('value')
    .then(snapshot => {
        const message = JSON.stringify(snapshot.val())
        return publishToCloudMqtt(message)
    })
    .catch(err => console.error(err))
    return Promise.resolve("done");
  });

// mqttTrigger({before: 24, after: 25}, {params: {status: 'temp'}})
