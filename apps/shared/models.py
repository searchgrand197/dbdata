import uuid

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        return super().save(*args, **kwargs)


class UUIDPrimaryKeyModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)


class SoftDeleteModel(models.Model):
    """
    Soft delete support for entities where deletion should be auditable.
    """

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteQuerySet.as_manager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def hard_delete(self):
        return super().delete()


class Hospital(TimeStampedModel, UUIDPrimaryKeyModel):
    """
    Tenant model to enable future multi-hospital expansion.
    """

    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=64, unique=True)
    timezone = models.CharField(max_length=64, default="UTC")
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.name
