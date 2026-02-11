<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@inhilapp.test');
        $password = env('ADMIN_PASSWORD', 'admin123');

        $user = User::where('email', $email)->first();

        if (! $user) {
            User::create([
                'name' => 'Admin',
                'email' => $email,
                'password' => Hash::make($password),
            ]);
            return;
        }

        $user->update([
            'password' => Hash::make($password),
        ]);
    }
}
