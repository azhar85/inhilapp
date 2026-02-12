<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'store_name',
        'store_tagline',
        'logo_url',
        'qris_url',
        'admin_whatsapp',
    ];
}
