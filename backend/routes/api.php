<?php

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentProofController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Admin\SiteSettingController as AdminSiteSettingController;
use App\Http\Controllers\Admin\VoucherController as AdminVoucherController;
use App\Http\Controllers\Admin\StockController as AdminStockController;
use Illuminate\Support\Facades\Route;

Route::get('/products', [ProductController::class, 'index']);
Route::get('/settings', [SiteSettingController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::post('/orders/{id}/payment-proof', [PaymentProofController::class, 'store']);
Route::post('/vouchers/validate', [VoucherController::class, 'validateVoucher']);

Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->middleware('admin.auth');

Route::prefix('admin')->middleware('admin.auth')->group(function () {
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{product}', [AdminProductController::class, 'update']);
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::put('/orders/{order}', [AdminOrderController::class, 'update']);

    Route::get('/settings', [AdminSiteSettingController::class, 'show']);
    Route::post('/settings', [AdminSiteSettingController::class, 'update']);

    Route::get('/vouchers', [AdminVoucherController::class, 'index']);
    Route::post('/vouchers', [AdminVoucherController::class, 'store']);
    Route::put('/vouchers/{voucher}', [AdminVoucherController::class, 'update']);
    Route::delete('/vouchers/{voucher}', [AdminVoucherController::class, 'destroy']);

    Route::get('/stocks', [AdminStockController::class, 'index']);
    Route::post('/stocks', [AdminStockController::class, 'store']);
    Route::put('/stocks/{stock}', [AdminStockController::class, 'update']);
    Route::delete('/stocks/{stock}', [AdminStockController::class, 'destroy']);
});
