module teraflop.platform;

import std.conv : castFrom, to;
import std.exception : enforce;
version (Windows) import win32.windows;

extern(C) struct Icon {
  size_t width, height;

  version (Windows) HICON _ptr;
  else void* _ptr;

  ~this() {
    version (Windows) {
      DeleteObject(ptr);
      this._ptr = null;
    } else this._ptr = null;
  }

  version (Windows) HICON ptr() const @property {
    return castFrom!(const void*).to!(HICON)(this._ptr);
  } else T ptr(T = void*)() const @property if (isPointer!T) {
    return castFrom!(const void*).to!T(this._ptr);
  }
}

extern(C) bool setIcon(char* filePath) {
  import std.conv : text;
  import std.file : exists, read;
  import std.string : fromStringz;

  enforce(filePath.fromStringz.exists, "File not found: " ~ filePath.fromStringz);
  ubyte[] file = castFrom!(void[]).to!(ubyte[])(filePath.fromStringz.read);

  version (Windows) {
    const icon = LoadIconFromPng(filePath.fromStringz.to!string);
    // TODO: Set this app's icon
    return true;
  } else version (Linux) return false;
  else return false;
}

version (Windows):

// TODO Contribute these Stream symbols back to `win32.objidl`.
///
extern (C++) interface ISequentialStream : IUnknown {}
///
extern (C++) interface IStream : ISequentialStream  {}

// TODO Contribute these WIC symbols back to `win32.wincodec`.
/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/wincodec/nn-wincodec-iwicbitmapdecoder">IWICBitmapDecoder</a> (wincodec.h)
extern (C++) interface IWICBitmapDecoder : IUnknown {
  ///
  HRESULT Initialize(IStream*, int);
  ///
  HRESULT GetFrameCount(uint* count);
  ///
  HRESULT GetFrame(int index, IWICBitmapFrameDecode**);
}
/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/wincodec/nn-wincodec-iwicbitmapsource">IWICBitmapSource</a> (wincodec.h)
extern (C++) interface IWICBitmapSource : IUnknown {
   ///
   HRESULT GetSize(UINT* puiWidth, UINT* puiHeight);
   ///
   HRESULT GetPixelFormat(WICPixelFormatGUID* pPixelFormat);
   ///
   HRESULT GetResolution(double* pDpiX, double* pDpiY);
   ///
   HRESULT CopyPixels(const WICRect* prc,
      UINT cbStride,
      UINT cbBufferSize,
      BYTE* pbBuffer);
   /// Optional:
   // TODO: HRESULT CopyPalette(IWICPalette* pIPalette);
}
///
extern (C++) interface IWICPalette : IUnknown {}
///
extern (C++) interface IWICBitmapFrameDecode : IUnknown {}

/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/wincodec/nn-wincodec-iwicbitmapdecoder">IWICBitmapDecoder</a> (wincodec.h)
static const CLSID_WICPngDecoder = new Guid(0x389ea17b, 0x5078, 0x4cde, 0xb6, 0xef, 0x25, 0xc1, 0x51, 0x75, 0xc7, 0x51);
/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/wtypesbase/ne-wtypesbase-clsctx">CLSCTX enumeration</a> (wtypesbase.h)
enum CLSCTX {
  ///
  INPROC_SERVER = 0x1,
  ///
  INPROC_HANDLER = 0x2,
  ///
  LOCAL_SERVER = 0x4,
  ///
  INPROC_SERVER16 = 0x8,
  ///
  REMOTE_SERVER = 0x10,
  ///
  INPROC_HANDLER16 = 0x20,
  ///
  RESERVED1 = 0x40,
  ///
  RESERVED2 = 0x80,
  ///
  RESERVED3 = 0x100,
  ///
  RESERVED4 = 0x200,
  ///
  NO_CODE_DOWNLOAD = 0x400,
  ///
  RESERVED5 = 0x800,
  ///
  NO_CUSTOM_MARSHAL = 0x1000,
  ///
  ENABLE_CODE_DOWNLOAD = 0x2000,
  ///
  NO_FAILURE_LOG = 0x4000,
  ///
  DISABLE_AAA = 0x8000,
  ///
  ENABLE_AAA = 0x10000,
  ///
  FROM_DEFAULT_CONTEXT = 0x20000,
  ///
  ACTIVATE_X86_SERVER = 0x40000,
  ACTIVATE_32_BIT_SERVER,
  ///
  ACTIVATE_64_BIT_SERVER = 0x80000,
  ///
  ENABLE_CLOAKING = 0x100000,
  ///
  APPCONTAINER = 0x400000,
  ///
  ACTIVATE_AAA_AS_IU = 0x800000,
  ///
  RESERVED6 = 0x1000000,
  ///
  ACTIVATE_ARM32_SERVER = 0x2000000,
  ALLOW_LOWER_TRUST_REGISTRATION,
  ///
  PS_DLL = 0x80000000
}
/// See_Also: <a href="https://referencesource.microsoft.com/#PresentationCore/Graphics/include/wgx_exports.cs"></a> (C#.NET PresentationCore)
enum WICPixelFormatGUIDs {
  _32bppPBGRA = new Guid(0x6fddc324, 0x4e03, 0x4bfe, 0xb1.to!ubyte, 0x85.to!ubyte, 0x3d, 0x77, 0x76, 0x8d.to!ubyte, 0xc9.to!ubyte, 0x10),
}
/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/wincodec/ne-wincodec-wicdecodeoptions">WICDecodeOptions</a> (wincodec.h)
enum WICDecodeOptions {
  CacheOnDemand = 0,
  CacheOnLoad = 0x1,
  FORCE_DWORD = 0x7fffffff
}

///
struct Guid {
  package int     _a;
  package short   _b;
  package short   _c;
  package ubyte  _d;
  package ubyte  _e;
  package ubyte  _f;
  package ubyte  _g;
  package ubyte  _h;
  package ubyte  _i;
  package ubyte  _j;
  package ubyte  _k;

  static Guid* Empty() {
    return new Guid();
  }

  GUID* ptr() const @property {
    return castFrom!(const(Guid)*).to!(GUID*)(&this);
  }
}
///
struct WICRect {
  INT x, y, width, height;
}
///
alias WICPixelFormatGUID = Guid*;

/// Params:
/// Expr: Can be a type name.
Guid* __uuidof(string Expr)() {
  return Guid.Empty;
}
import std.traits : isPointer, isArray;
/// Params:
/// Expr: Can be a pointer, reference, or array of that type, a template specialized on these types, or a variable of these types. The argument is valid as long as the compiler can use it to find the attached GUID.
Guid* __uuidof(T)(T value) if (isPointer!T || is(T : IUnknown) || isArray!T) {
  return Guid.Empty;
}

///
extern(C) void WICConvertBitmapSource(WICPixelFormatGUIDs, IWICBitmapFrameDecode*, IWICBitmapSource**);

/// See_Also: <a href="https://faithlife.codes/blog/2008/09/displaying_a_splash_screen_with_c_part_i">Displaying a Splash Screen with C++</a> (Faithlife.codes Blog)
IWICBitmapSource* LoadBitmapFromStream(IStream* ipImageStream) {
  import std.conv : asOriginalType;

  // initialize return value
  IWICBitmapSource* ipBitmap = null;

  // Load WIC's PNG decoder
  IWICBitmapDecoder* ipDecoder = null;
  if (FAILED(CoCreateInstance(CLSID_WICPngDecoder.ptr, null, CLSCTX.INPROC_SERVER, __uuidof(ipDecoder).ptr, cast(void**) (&ipDecoder)))) goto Return;
  // Load the PNG
  if (FAILED(ipDecoder.Initialize(ipImageStream, WICDecodeOptions.CacheOnLoad.asOriginalType))) goto ReleaseDecoder;

EnforceFrameCount:
  // Check for the presence of the first frame in the bitmap
  UINT nFrameCount = 0;
  if (FAILED(ipDecoder.GetFrameCount(&nFrameCount)) || nFrameCount != 1) goto ReleaseDecoder;

LoadFirstFrame:
  // Load the first frame, i.e. the image
  IWICBitmapFrameDecode* ipFrame = null;
  if (FAILED(ipDecoder.GetFrame(0, &ipFrame))) goto ReleaseDecoder;

  // Convert the image to 32bpp BGRA format with pre-multiplied alpha
  //   (it may not be stored in that format natively in the PNG resource,
  //   but we need this format to create the DIB to use on-screen)
  // See https://learn.microsoft.com/en-us/windows/win32/wic/-wic-codec-native-pixel-formats
  // See https://github.com/dotnet/winforms/blob/8dd0293125e7be7d7215bfdca6c5adc7286d7859/src/System.Drawing.Common/src/System/Drawing/Imaging/PixelFormat.cs
  WICConvertBitmapSource(WICPixelFormatGUIDs._32bppPBGRA, ipFrame, &ipBitmap);
  ipFrame.Release();

ReleaseDecoder:
  ipDecoder.Release();

Return:
  return ipBitmap;
}

/// Example: `IDI_SPLASHIMAGE PNG splash.png`
void* MAKEINTRESOURCE() {
  assert(0, "Unimplemented!");
  return null;
}

/// See_Also: <a href="https://learn.microsoft.com/en-us/windows/win32/api/shlwapi/nf-shlwapi-shcreatememstream">SHCreateMemStream</a> (shlwapi.h)
extern (C) IStream* SHCreateMemStream(const BYTE* pInit, UINT  cbInit);

///
HBITMAP LoadPng(string filePath) {
  import std.file : exists;
  import std.stdio : File;

  HBITMAP hBmp = null;

  // load the PNG image data into a stream
  enforce(filePath.exists, "File not found: " ~ filePath);
  auto file = File(filePath);
  assert(!file.eof, "Unexpected end of file!");
  auto fileBuf = new ubyte[file.size];
  IStream* ipImageStream = SHCreateMemStream(file.rawRead(fileBuf).ptr, fileBuf.length.to!uint);
  if (ipImageStream is null) return null;
  // TODO: Feed a file stream to ipImageStream: filePath.toStringz, _T("PNG")

LoadBitmap:
  // Obtain a handle to the screen device context.
  HDC hdcScreen = GetDC(null);

  // load the bitmap with WIC
  IWICBitmapSource* ipBitmap = LoadBitmapFromStream(ipImageStream);
  if (ipBitmap is null) goto ReleaseStream;

CreateBitmap:
  // create a HBITMAP containing the image
  const BITMAP* hBmpPtr = (castFrom!(IWICBitmapSource*).to!(const(BITMAP)*)(ipBitmap));
  hBmp = castFrom!(typeof(hBmpPtr)).to!(typeof(hBmp))(hBmpPtr);
  ipBitmap.Release();

ReleaseStream:
  file.close();
  ipImageStream.Release();
Return:
  return hBmp;
}

///
Icon LoadIconFromPng(string filePath) {
  auto hBmp = LoadPng(filePath);
  SIZE size;
  assert(GetBitmapDimensionEx(hBmp, &size), "Could not determine dimensions of PNG.");

  // Obtain a handle to the screen device context.
  HDC hdcScreen = GetDC(null);
  // Icons require masks to indicate transparent and opaque areas. Since this
  // simple example has no transparent areas, we use a fully opaque mask.
  HBITMAP hBmpMask = CreateCompatibleBitmap(hdcScreen, size.cx, size.cy);
  ICONINFO ii;
  ii.fIcon = TRUE;
  ii.hbmMask = hBmpMask;
  ii.hbmColor = hBmp;
  HICON hIcon = CreateIconIndirect(&ii);

  ReleaseDC(null, hdcScreen);
Return:
  return Icon(size.cx, size.cy, hIcon);
}

///
Icon CreateSolidColorIcon(COLORREF iconColor, int width, int height) {
  import win32.winuser : GetDC;

  // Obtain a handle to the screen device context.
  HDC hdcScreen = GetDC(null);

  // Create a memory device context, which we will draw into.
  HDC hdcMem = CreateCompatibleDC(hdcScreen);

  // Create the bitmap, and select it into the device context for drawing.
  HBITMAP hBmp = CreateCompatibleBitmap(hdcScreen, width, height);
  HBITMAP hBmpOld = cast(HBITMAP) SelectObject(hdcMem, hBmp);

  // Fill a solid color rectangle with `iconColor` in the specified dimensions.
  HPEN hpen        = CreatePen(PS_SOLID, 1, iconColor);
  HPEN hpenOld     = cast(HPEN) SelectObject(hdcMem, hpen);
  HBRUSH hbrush    = CreateSolidBrush(iconColor);
  HBRUSH hbrushOld = cast(HBRUSH) SelectObject(hdcMem, hbrush);
  Rectangle(hdcMem, 0, 0, width, height);
  SelectObject(hdcMem, hbrushOld);
  SelectObject(hdcMem, hpenOld);
  // Tidy resources.
  DeleteObject(hbrush);
  DeleteObject(hpen);

  // Create an icon from the bitmap.
  //
  // Icons require masks to indicate transparent and opaque areas. Since this
  // simple example has no transparent areas, we use a fully opaque mask.
  HBITMAP hBmpMask = CreateCompatibleBitmap(hdcScreen, width, height);
  ICONINFO ii;
  ii.fIcon = TRUE;
  ii.hbmMask = hBmpMask;
  ii.hbmColor = hBmp;
  HICON hIcon = CreateIconIndirect(&ii);

  // Tidy resources.
  DeleteObject(hBmpMask);
  SelectObject(hdcMem, hBmpOld);
  DeleteDC(hdcMem);
  ReleaseDC(null, hdcScreen);

  return Icon(width, height, hIcon);
}
