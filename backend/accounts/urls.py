
from django.urls import path
from . import views

urlpatterns = [
    path('register/step1/',    views.register_step1,       name='register-step1'),
    path('register/otp/',      views.verify_otp,           name='verify-otp'),
    path('register/otp/resend/',views.resend_otp,          name='resend-otp'),
    path('register/complete/', views.complete_registration, name='register-complete'),
    path('forgot-password/',    views.forgot_password,      name='forgot-password'),
    path('reset-password/',     views.reset_password,       name='reset-password'),
    path('login/',             views.login,                 name='login'),
    path('logout/',            views.logout,                name='logout'),
    path('profile/',           views.profile,               name='profile'),
    path('pin/change/',        views.change_pin,            name='change-pin'),
    path('biometric/',         views.toggle_biometric,      name='toggle-biometric'),
    path('freeze/',            views.freeze_account,        name='freeze-account'),
    path('sessions/',          views.sessions,              name='sessions'),
    path('sessions/<int:session_id>/end/', views.end_session,    name='end-session'),
    path('sessions/end-all/',  views.end_all_sessions,      name='end-all-sessions'),
    path('test/create-user/',   views.test_create_user,      name='test-create-user'),
]
