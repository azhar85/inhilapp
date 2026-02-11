<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/storage/{path}', function (string $path) {
    $path = ltrim($path, '/');
    if (! Storage::disk('public')->exists($path)) {
        abort(404);
    }

    $mime = Storage::disk('public')->mimeType($path) ?? 'application/octet-stream';

    return response()->stream(function () use ($path) {
        echo Storage::disk('public')->get($path);
    }, 200, ['Content-Type' => $mime]);
})->where('path', '.*');
