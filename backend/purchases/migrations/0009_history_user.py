# Generated for per-user history isolation

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0008_purchaserequest_is_validated_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='sourcinghistory',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sourcing_histories', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='quotecomparisonhistory',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quote_comparisons', to=settings.AUTH_USER_MODEL),
        ),
    ]
