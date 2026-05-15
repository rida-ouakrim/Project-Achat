import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0003_purchaserequest_refusal_reason'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='purchaserequest',
            name='price',
        ),
        migrations.RemoveField(
            model_name='purchaserequest',
            name='product',
        ),
        migrations.RemoveField(
            model_name='purchaserequest',
            name='qty',
        ),
        migrations.RemoveField(
            model_name='purchaserequest',
            name='supplier',
        ),
        migrations.CreateModel(
            name='PurchaseItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('product', models.CharField(max_length=200)),
                ('qty', models.IntegerField()),
                ('supplier', models.CharField(blank=True, max_length=150, null=True)),
                ('price', models.CharField(blank=True, max_length=50, null=True)),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='purchases.purchaserequest')),
            ],
        ),
    ]
