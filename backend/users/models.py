from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model with additional fields for the ATS platform"""
    
    # Override username to use email instead
    username = None
    email = models.EmailField(unique=True, verbose_name='Email Address')
    
    # Additional fields as specified
    full_name = models.CharField(max_length=255, verbose_name='Full Name')
    date_joined = models.DateTimeField(default=timezone.now, verbose_name='Date Joined')
    last_login = models.DateTimeField(blank=True, null=True, verbose_name='Last Login')
    
    # Future extensible fields (keeping it simple for Phase 1)
    is_verified = models.BooleanField(default=False, verbose_name='Email Verified')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    def get_full_name(self):
        return self.full_name
    
    def get_short_name(self):
        return self.full_name.split(' ')[0] if self.full_name else self.email


class UserProfile(models.Model):
    """Extended profile information for users"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Profile fields for future use
    phone_number = models.CharField(max_length=20, blank=True, verbose_name='Phone Number')
    linkedin_url = models.URLField(blank=True, verbose_name='LinkedIn Profile')
    github_url = models.URLField(blank=True, verbose_name='GitHub Profile')
    
    # Preferences
    preferred_job_titles = models.JSONField(default=list, blank=True, verbose_name='Preferred Job Titles')
    notification_preferences = models.JSONField(default=dict, blank=True, verbose_name='Notification Preferences')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"Profile for {self.user.full_name}"
