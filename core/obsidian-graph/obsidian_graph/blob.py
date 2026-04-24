"""BlobArchive — MinIO/S3-compatible archive for ledger snapshots + artifacts."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import boto3
from botocore.client import Config


class BlobArchive:
    """Minimal S3-compatible wrapper. Backs ledger archival and model checkpoints.

    Bucket convention (per whitepaper §5 + §5.2 archival policy):
      - obsidian-ledger-archive   — daily ledger snapshots per agent
      - obsidian-model-checkpoints — Signal Agent weights, LLM adapters
      - obsidian-replay-artifacts  — Tape replay packages
      - obsidian-motherseed        — L47 civilization-state packages
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ) -> None:
        self._endpoint = endpoint or os.environ.get("MINIO_ENDPOINT", "http://localhost:19001")
        ak = access_key or os.environ.get("MINIO_ACCESS_KEY", "obsidian")
        sk = secret_key or os.environ.get("MINIO_SECRET_KEY", "obsidian-minio")
        self._s3 = boto3.client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=ak,
            aws_secret_access_key=sk,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def ensure_bucket(self, name: str) -> None:
        existing = {b["Name"] for b in self._s3.list_buckets().get("Buckets", [])}
        if name not in existing:
            self._s3.create_bucket(Bucket=name)

    def put_file(self, bucket: str, key: str, path: Path) -> None:
        self.ensure_bucket(bucket)
        self._s3.upload_file(str(path), bucket, key)

    def put_bytes(self, bucket: str, key: str, data: bytes) -> None:
        self.ensure_bucket(bucket)
        self._s3.put_object(Bucket=bucket, Key=key, Body=data)

    def get_bytes(self, bucket: str, key: str) -> bytes:
        obj = self._s3.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()

    def list_keys(self, bucket: str, prefix: str = "") -> list[str]:
        self.ensure_bucket(bucket)
        out: list[str] = []
        paginator = self._s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                out.append(obj["Key"])
        return out
