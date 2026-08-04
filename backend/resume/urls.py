from django.urls import path
from . import views

app_name = 'resume'

urlpatterns = [
    # Phase 3.2 - Resume Analysis Engine endpoints
    path('upload/', views.upload_resume, name='upload-resume'),
    path('list/', views.list_user_resumes, name='list-resumes'),
    path('<uuid:resume_id>/', views.get_resume_data, name='get-resume-data'),
]