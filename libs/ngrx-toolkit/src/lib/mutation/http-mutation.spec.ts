import { HttpEventType, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpMutation, httpMutation } from './http-mutation';

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface AddUserEntry {
  firstname: string;
  name: string;
  email: string;
}

describe('httpMutation', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create httpMutation instance', () => {
    const createUser = TestBed.runInInjectionContext(() =>
      httpMutation<CreateUserRequest, User>({
        request: (userData) => ({
          url: '/api/users',
          method: 'POST',
          body: userData,
        }),
      }),
    );

    expect(createUser).toBeDefined();
    expect(createUser.status()).toBe('idle');
    expect(createUser.isPending()).toBe(false);
  });

  it('should perform successful POST request using shorthand syntax', () => {
    const createUser = TestBed.runInInjectionContext(() =>
      httpMutation<CreateUserRequest, User>((userData) => ({
        url: '/api/users',
        method: 'POST',
        body: userData,
      })),
    );

    expect(createUser.status()).toBe('idle');
    expect(createUser.isPending()).toBe(false);

    const newUser = { name: 'John Doe', email: 'john@example.com' };
    createUser(newUser);

    expect(createUser.isPending()).toBe(true);
    expect(createUser.status()).toBe('pending');

    const req = httpTestingController.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);

    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    };
    req.flush(mockUser);

    expect(createUser.status()).toBe('success');
    expect(createUser.isPending()).toBe(false);
    expect(createUser.value()).toEqual(mockUser);
  });

  it('should perform successful POST request', () => {
    const userSignal = signal<User | null>(null);

    const createUser = TestBed.runInInjectionContext(() =>
      httpMutation<CreateUserRequest, User>({
        request: (userData) => ({
          url: '/api/users',
          method: 'POST',
          body: userData,
        }),
        onSuccess: (user) => {
          userSignal.set(user);
        },
      }),
    );

    expect(createUser.status()).toBe('idle');
    expect(createUser.isPending()).toBe(false);

    const newUser = { name: 'John Doe', email: 'john@example.com' };
    createUser(newUser);

    expect(createUser.isPending()).toBe(true);
    expect(createUser.status()).toBe('pending');

    const req = httpTestingController.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);

    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    };
    req.flush(mockUser);

    expect(createUser.status()).toBe('success');
    expect(createUser.isPending()).toBe(false);
    expect(createUser.value()).toEqual(mockUser);
    expect(userSignal()).toEqual(mockUser);
  });

  it('should handle HTTP errors', () => {
    let errorCaptured: unknown = null;

    const createUser = TestBed.runInInjectionContext(() =>
      httpMutation<CreateUserRequest, User>({
        request: (userData) => ({
          url: '/api/users',
          method: 'POST',
          body: userData,
        }),
        onError: (error) => {
          errorCaptured = error;
        },
      }),
    );

    const invalidUser = { name: '', email: 'invalid-email' };
    createUser(invalidUser);

    const req = httpTestingController.expectOne('/api/users');
    expect(req.request.body).toEqual(invalidUser);
    req.flush(
      { message: 'Validation failed' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(createUser.status()).toBe('error');
    expect(createUser.error()).toBeDefined();
    expect(errorCaptured).toBeDefined();
  });

  it('should perform successful POST request with upload and download', () => {
    const createdUserSignal = signal<User | null>(null);

    const createUser = TestBed.runInInjectionContext(() =>
      httpMutation<CreateUserRequest, User>({
        request: (userData) => ({
          url: '/api/users',
          method: 'POST',
          body: userData,
          headers: { 'Content-Type': 'application/json' },
          reportProgress: true,
        }),
        onSuccess: (user) => {
          createdUserSignal.set(user);
        },
      }),
    );

    expect(createUser.status()).toBe('idle');
    expect(createUser.uploadProgress()).toBeUndefined();
    expect(createUser.downloadProgress()).toBeUndefined();

    const newUser = { name: 'Jane Doe', email: 'jane@example.com' };
    createUser(newUser);

    expect(createUser.isPending()).toBe(true);
    expect(createUser.status()).toBe('pending');

    const req = httpTestingController.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.event({
      type: HttpEventType.UploadProgress,
      loaded: 50,
      total: 100,
    });

    expect(createUser.uploadProgress()).toEqual({
      type: HttpEventType.UploadProgress,
      loaded: 50,
      total: 100,
    });

    req.event({
      type: HttpEventType.DownloadProgress,
      loaded: 80,
      total: 100,
    });

    expect(createUser.downloadProgress()).toEqual({
      type: HttpEventType.DownloadProgress,
      loaded: 80,
      total: 100,
    });

    const mockCreatedUser: User = { id: 2, ...newUser };
    req.flush(mockCreatedUser);

    expect(createUser.status()).toBe('success');
    expect(createUser.isPending()).toBe(false);
    expect(createUser.value()).toEqual(mockCreatedUser);
    expect(createdUserSignal()).toEqual(mockCreatedUser);
  });

  it('should perform successful DELETE request', () => {
    let deletedUserId: number | null = null;

    const deleteUser = TestBed.runInInjectionContext(() =>
      httpMutation<number, { success: boolean; message: string }>({
        request: (userId) => ({
          url: `/api/users/${userId}`,
          method: 'DELETE',
          headers: { Authorization: 'Bearer token123' },
        }),
        onSuccess: (response) => {
          deletedUserId = response.success ? 1 : null;
        },
      }),
    );

    expect(deleteUser.status()).toBe('idle');
    expect(deleteUser.isPending()).toBe(false);

    deleteUser(1);

    expect(deleteUser.isPending()).toBe(true);
    expect(deleteUser.status()).toBe('pending');

    const req = httpTestingController.expectOne('/api/users/1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token123');
    expect(req.request.body).toBeNull();

    const mockResponse = {
      success: true,
      message: 'User deleted successfully',
    };
    req.flush(mockResponse);

    expect(deleteUser.status()).toBe('success');
    expect(deleteUser.isPending()).toBe(false);
    expect(deleteUser.value()).toEqual(mockResponse);
    expect(deletedUserId).toBe(1);
  });

  it('should handle DELETE request with error', () => {
    let errorCaptured: unknown = null;

    const deleteUser = TestBed.runInInjectionContext(() =>
      httpMutation<number, { success: boolean }>({
        request: (userId) => ({
          url: `/api/users/${userId}`,
          method: 'DELETE',
        }),
        onError: (error) => {
          errorCaptured = error;
        },
      }),
    );

    deleteUser(999);

    const req = httpTestingController.expectOne('/api/users/999');
    expect(req.request.method).toBe('DELETE');

    req.flush(
      { error: 'Forbidden', message: 'You cannot delete this user' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(deleteUser.status()).toBe('error');
    expect(deleteUser.error()).toBeDefined();
    expect(errorCaptured).toBeDefined();
  });

  it('should track large data upload with progress', () => {
    interface LargeDataUpload {
      title: string;
      content: string;
      metadata: {
        author: string;
        tags: string[];
        size: number;
      };
    }

    const uploadData = TestBed.runInInjectionContext(() =>
      httpMutation<
        LargeDataUpload,
        { id: string; title: string; uploadedSize: number }
      >({
        request: (data) => ({
          url: '/api/documents',
          method: 'POST',
          body: data,
          headers: { 'Content-Type': 'application/json' },
          reportProgress: true,
        }),
      }),
    );

    const mockData: LargeDataUpload = {
      title: 'Large Document',
      content:
        'This is a very large document content with lots of text data...',
      metadata: {
        author: 'John Doe',
        tags: ['important', 'document', 'large'],
        size: 1024000,
      },
    };

    expect(uploadData.uploadProgress()).toBeUndefined();
    expect(uploadData.downloadProgress()).toBeUndefined();

    uploadData(mockData);

    const req = httpTestingController.expectOne('/api/documents');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockData);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');

    req.event({
      type: HttpEventType.UploadProgress,
      loaded: 256000,
      total: 1024000,
    });

    expect(uploadData.uploadProgress()).toEqual({
      type: HttpEventType.UploadProgress,
      loaded: 256000,
      total: 1024000,
    });

    req.event({
      type: HttpEventType.UploadProgress,
      loaded: 768000,
      total: 1024000,
    });

    expect(uploadData.uploadProgress()).toEqual({
      type: HttpEventType.UploadProgress,
      loaded: 768000,
      total: 1024000,
    });

    req.event({
      type: HttpEventType.UploadProgress,
      loaded: 1024000,
      total: 1024000,
    });

    const mockResponse = {
      id: 'doc-456',
      title: 'Large Document',
      uploadedSize: 1024000,
    };

    req.flush(mockResponse);

    expect(uploadData.status()).toBe('success');
    expect(uploadData.value()).toEqual(mockResponse);
  });

  it('can be explicitly typed', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation<AddUserEntry, boolean>((userData: AddUserEntry) => ({
        url: 'api/users',
        method: 'POST',
        body: userData,
      })) satisfies HttpMutation<AddUserEntry, boolean>;
    });
  });

  it('can be implicitly typed via request and parse', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation({
        request: (userData: AddUserEntry) => ({
          url: 'api/users',
          method: 'POST',
          body: userData,
        }),
        parse: Boolean,
      }) satisfies HttpMutation<AddUserEntry, boolean>;
    });
  });

  it('can be implicitly typed via a request without a body, and parse', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation({
        request: (id: number) => ({
          url: `api/users/${id}`,
          method: 'DELETE',
        }),
        parse: Boolean,
      }) satisfies HttpMutation<number, boolean>;
    });
  });

  it('can not be implicitly typed with both onSuccess and parse having different types', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation({
        request: (userData: AddUserEntry) => ({
          url: 'api/users',
          method: 'POST',
          body: userData,
        }),
        parse: Boolean,
        // @ts-expect-error onSuccess need to use the type of parse
        onSuccess: (result: { userId: number }) => {
          console.log('User created:', result);
        },
      });
    });
  });

  it('can be implicitly typed with both onSuccess and parse having same type', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation({
        request: (userData: AddUserEntry) => ({
          url: 'api/users',
          method: 'POST',
          body: userData,
        }),
        parse: (result) => result as { id: number },
        onSuccess: (result) => {
          console.log('User created:', result);
        },
      }) satisfies HttpMutation<AddUserEntry, { id: number }>;
    });
  });

  it('can be implicitly typed by defining onSuccess only', () => {
    TestBed.runInInjectionContext(() => {
      httpMutation({
        request: (userData: AddUserEntry) => ({
          url: 'api/users',
          method: 'POST',
          body: userData,
        }),
        onSuccess: (result: { id: number }) => {
          console.log('User created:', result);
        },
      }) satisfies HttpMutation<AddUserEntry, { id: number }>;
    });
  });

  it('should support non-json responseType such as blob', () => {
    const downloadFile = TestBed.runInInjectionContext(() =>
      httpMutation<string, Blob>({
        request: (fileId) => ({
          url: `/api/files/${fileId}`,
          method: 'GET',
          responseType: 'blob',
        }),
      }),
    );

    downloadFile('report-1');

    const req = httpTestingController.expectOne('/api/files/report-1');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    const mockBlob = new Blob(['file-contents'], { type: 'text/plain' });
    req.flush(mockBlob);

    expect(downloadFile.status()).toBe('success');
    expect(downloadFile.value()).toEqual(mockBlob);
  });
});
