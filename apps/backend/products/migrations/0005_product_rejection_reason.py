# Generated by Django 5.2 on 2025-06-08 14:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_remove_product_is_approved_product_approve_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='rejection_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]
