const amqp = require('amqplib');
const rabbitmqHost = process.env.RABBITMQHOST || 'localhost';
const rabbitmqUrl = `amqp://${rabbitmqHost}`;

let channel = null;

async function connectToRabbit(queue) {
    const connection = await amqp.connect(rabbitmqUrl)
    channel = await connection.createChannel()
    await channel.assertQueue(queue, { durable: true })
}

function getChannel() {
    return channel
}

module.exports = { connectToRabbit, getChannel }