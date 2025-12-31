import json
import logging
from typing import Optional, Dict, Any
from confluent_kafka import Producer, KafkaError
from confluent_kafka.admin import AdminClient, NewTopic

from .config import settings

logger = logging.getLogger(__name__)


class KafkaProducerClient:
    def __init__(self):
        self.producer: Optional[Producer] = None
        self._initialize()
    
    def _initialize(self):
        if not settings.confluent_bootstrap_servers or not settings.confluent_api_key:
            logger.warning("Kafka credentials not configured, producer disabled")
            return
        
        config = {
            'bootstrap.servers': settings.confluent_bootstrap_servers,
            'security.protocol': 'SASL_SSL',
            'sasl.mechanisms': 'PLAIN',
            'sasl.username': settings.confluent_api_key,
            'sasl.password': settings.confluent_api_secret,
            'client.id': 'airline-disruption-api',
        }
        
        try:
            self.producer = Producer(config)
            logger.info("Kafka producer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
    
    def produce(self, topic: str, key: str, value: Dict[str, Any]) -> bool:
        if not self.producer:
            logger.warning(f"Kafka producer not available, skipping message to {topic}")
            return False
        
        try:
            self.producer.produce(
                topic=topic,
                key=key.encode('utf-8'),
                value=json.dumps(value).encode('utf-8'),
                callback=self._delivery_callback
            )
            self.producer.poll(0)
            return True
        except Exception as e:
            logger.error(f"Failed to produce message to {topic}: {e}")
            return False
    
    def flush(self):
        if self.producer:
            self.producer.flush()
    
    @staticmethod
    def _delivery_callback(err, msg):
        if err:
            logger.error(f'Message delivery failed: {err}')
        else:
            logger.info(f'Message delivered to {msg.topic()} [{msg.partition()}]')


kafka_producer = KafkaProducerClient()
